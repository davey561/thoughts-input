import { onDocumentCreated } from "firebase-functions/v2/firestore"
import { onCall } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import * as admin from "firebase-admin"
import { FieldValue, getFirestore } from "firebase-admin/firestore"
// import fetch from 'node-fetch';

const app = admin.initializeApp()

const openaiApiKey = defineSecret("OPENAI_API_KEY")

export const generateEmbedding = onDocumentCreated(
  {
    document: "thoughts/{docId}",
    region: "us-central1",
    secrets: [openaiApiKey],
  },
  async (event) => {
    const data = event.data?.data()
    const text = data?.text

    if (!text) {
      console.error("No text found in document!")
      return
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey.value()}`,
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-ada-002",
        }),
      })

      if (!response.ok) {
        console.error("Error from OpenAI API:", response.statusText)
        return
      }

      const result = await response.json()
      console.log("OpenAI API response:", result)

      const embedding = result?.data?.[0]?.embedding
      if (!embedding) {
        console.error("No embedding returned from OpenAI API")
        return
      }

      // 2. Use FieldValue.vector(...) to store the embedding as a vector field
      await admin
        .firestore()
        .doc(event.data?.ref.path)
        .update({
          embedding: FieldValue.vector(embedding), // <-- The important change
        })

      console.log("Firestore document updated with embedding as a vector field")
    } catch (error) {
      console.error("Error generating embedding:", error)
    }
  }
)
const db = getFirestore(app)

export const getRelatedThoughts = onCall(async (request) => {
  const { docId } = request.data

  if (!docId) {
    throw new Error("No 'docId' parameter provided.")
  }

  try {
    // Retrieve the embedding for the given thought document
    const thoughtDoc = await db.collection("thoughts").doc(docId).get()

    if (!thoughtDoc.exists) {
      throw new Error("The provided thought document does not exist.")
    }

    const thoughtData = thoughtDoc.data()
    const queryEmbedding = thoughtData?.embedding
    console.log({ thoughtData })
    console.log("Generated Embedding:", queryEmbedding)
    console.log("Length of Embedding:", queryEmbedding?.length)

    if (!queryEmbedding) {
      throw new Error("No embedding found for the provided thought.")
    }

    // Perform vector search using Firestore's findNearest method
    const thoughtsRef = db.collection("thoughts")
    const searchResults = await thoughtsRef
      .findNearest({
        queryVector: queryEmbedding,
        vectorField: "embedding",
        limit: 50,
        distanceMeasure: "COSINE",
      })
      .get()

    console.log({ searchResults })

    // Extract and return related thoughts
    const relatedThoughts = searchResults.docs
      .filter((doc) => doc.id !== docId) // Exclude the original document
      .map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        distance: doc.data().distance,
      }))
    console.log({ relatedThoughts })

    return { relatedThoughts }
  } catch (error) {
    console.error("Error fetching related thoughts:", error)
    throw new Error("Failed to fetch related thoughts.")
  }
})

// Maximum number of texts to send in one embedding request
const EMBEDDING_BATCH_SIZE = 40

// Delay between API requests (in milliseconds) to avoid hitting rate limits
const EMBEDDING_DELAY_MS = 50

export const bulkUploadNotes = onCall(async (request) => {
  const { notes } = request.data

  if (!Array.isArray(notes)) {
    throw new Error("Invalid 'notes' parameter. Must be an array.")
  }

  const batch = db.batch()
  const embeddingPromises: Promise<void>[] = []

  try {
    // Split notes into batches for embedding
    const embeddingBatches = chunkArray(notes, EMBEDDING_BATCH_SIZE)

    for (const [index, batchNotes] of embeddingBatches.entries()) {
      // Process each batch sequentially with a delay
      const delay = index * EMBEDDING_DELAY_MS

      embeddingPromises.push(
        new Promise((resolve) => setTimeout(resolve, delay)).then(async () => {
          // Extract texts from the batch for embedding
          const texts = batchNotes.map((note) => note.text)
          const embeddings = await generateEmbeddingsForBulk(texts)

          // Add each note to Firestore along with its embedding
          batchNotes.forEach((note, i) => {
            const { text, timestamp, userId } = note
            const embedding = embeddings[i]
            const noteDocRef = db.collection("thoughts").doc()

            batch.set(noteDocRef, {
              text,
              timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)),
              userId,
              embedding,
            })
          })
        })
      )
    }

    // Wait for all embedding batches to complete
    await Promise.all(embeddingPromises)

    // Commit Firestore batch
    await batch.commit()

    console.log("Bulk upload completed successfully with embeddings.")
    return { success: true, message: "Notes uploaded successfully with embeddings." }
  } catch (error) {
    console.error("Error during bulk upload with embeddings:", error)
    throw new Error("Failed to upload notes with embeddings.")
  }
})

// Helper to generate embeddings for a batch of texts
const generateEmbeddingsForBulk = async (texts: string[]): Promise<number[][]> => {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey.value()}`,
      },
      body: JSON.stringify({
        input: texts,
        model: "text-embedding-ada-002",
      }),
    })

    if (!response.ok) {
      console.error("OpenAI API error:", response.statusText)
      throw new Error("Failed to generate embeddings.")
    }

    const result = await response.json()
    return result.data.map((item: any) => item.embedding)
  } catch (error) {
    console.error("Error generating embeddings:", error)
    throw new Error("Failed to generate embeddings.")
  }
}

// Helper to chunk an array into smaller arrays
const chunkArray = <T>(array: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
    array.slice(index * size, index * size + size)
  )
}
