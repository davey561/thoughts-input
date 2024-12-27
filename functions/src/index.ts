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

export const bulkUploadNotes = onCall(async (request) => {
  const { notes } = request.data

  if (!Array.isArray(notes)) {
    throw new Error("Invalid 'notes' parameter. Must be an array.")
  }

  const batch = db.batch()

  try {
    notes.forEach((note) => {
      const { text, timestamp, userId } = note
      if (!text || !timestamp || !userId) {
        throw new Error("Each note must have 'text', 'timestamp', and 'userId'.")
      }

      const noteDocRef = db.collection("thoughts").doc()
      batch.set(noteDocRef, {
        text, // Note content
        timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)),
        userId, // User ID
      })
    })

    await batch.commit()

    console.log("Bulk upload completed successfully.")
    return { success: true, message: "Notes uploaded successfully." }
  } catch (error) {
    console.error("Error during bulk upload:", error)
    throw new Error("Failed to upload notes.")
  }
})

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export const bulkUploadNotesWithEmbedding = onCall(async (request) => {
  const { notes } = request.data

  if (!Array.isArray(notes)) {
    throw new Error("Invalid 'notes' parameter. Must be an array.")
  }

  const batch = db.batch()

  try {
    // Prepare embeddings for all notes
    const texts = notes.map((note) => note.text)
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
      throw new Error(`OpenAI API Error: ${response.statusText}`)
    }

    const result = (await response.json()) as { data: any[] }
    const embeddings = result.data.map((item: any) => item.embedding)

    // Add notes with embeddings to Firestore
    notes.forEach((note, index) => {
      const { text, timestamp, userId } = note
      const embedding = embeddings[index]

      if (!text || !timestamp || !userId || !embedding) {
        throw new Error("Missing required fields for a note.")
      }

      const noteDocRef = db.collection("thoughts").doc()
      batch.set(noteDocRef, {
        text,
        timestamp: admin.firestore.Timestamp.fromDate(new Date(timestamp)),
        userId,
        embedding, // Save embedding directly
      })
    })

    await batch.commit()

    console.log("Bulk upload with embeddings completed successfully.")
    return { success: true, message: "Notes uploaded successfully with embeddings." }
  } catch (error) {
    console.error("Error during bulk upload with embeddings:", error)
    throw new Error("Failed to upload notes with embeddings.")
  }
})
