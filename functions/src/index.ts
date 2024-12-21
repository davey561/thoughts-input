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
