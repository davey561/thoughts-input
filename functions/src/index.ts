import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {onCall} from "firebase-functions/v2/https";
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
// import fetch from 'node-fetch';

admin.initializeApp();

const openaiApiKey = defineSecret('OPENAI_API_KEY');

export const generateEmbedding = onDocumentCreated(
  {
    document: 'thoughts/{docId}',
    region: 'us-central1',
    secrets: [openaiApiKey],
  },
  async (event) => {
    const data = event.data?.data();
    const text = data?.text;

    if (!text) {
      console.error('No text found in document!');
      return;
    }

    try {
      const response = 
      await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey.value()}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002',
        }),
      });
      // Check if the response is OK
  if (!response.ok) {
    console.error('Error from OpenAI API:', response.statusText);
    return;
  }

  const result = await response.json();

    // Log the full response to understand its structure
    console.log('OpenAI API response:', result);

    // Ensure the response contains the expected data structure
    const embedding = result?.data?.[0]?.embedding;

    if (!embedding) {
      console.error('No embedding returned from OpenAI API');
      return;
    }

    // Update the Firestore document with the embedding
    await admin.firestore().doc(event.data?.ref.path).update({ embedding });
    console.log('Firestore document updated with embedding');


    } catch (error) {
      console.error('Error generating embedding:', error);
    }
  }
);

const db = getFirestore();

export const getRelatedThoughts = onCall(
  async (request) => {
    const data = request.data;
    const {docId} = data;

    if (!docId) {
      throw new Error("No 'docId' parameter provided.");
    }

    try {
      // Step 1: Retrieve the embedding for the given thought document
      const thoughtDoc = await db.collection("thoughts").doc(docId).get();

      if (!thoughtDoc.exists) {
        throw new Error("The provided thought document does not exist.");
      }

      const thoughtData = thoughtDoc.data();
      const queryEmbedding = thoughtData?.embedding;

      if (!queryEmbedding) {
        throw new Error("No embedding found for the provided thought.");
      }

      // Step 2: Perform Firestore vector search
      const vectorQuery = {
        structuredQuery: {
          from: [{collectionId: "thoughts"}],
          limit: 5,
          orderBy: {
            field: {fieldPath: "embedding"},
            direction: "ASCENDING",
          },
          where: {
            fieldFilter: {
              field: {fieldPath: "embedding"},
              op: "NEAREST",
              value: {
                arrayValue: {
                  values: queryEmbedding.map((v: number) => ({doubleValue: v})),
                },
              },
            },
          },
        },
      };

      const searchResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/pastself/databases/(default)/documents:runQuery`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GOOGLE_CLOUD_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(vectorQuery),
        }
      );

      const searchData = await searchResponse.json();

      // Step 3: Extract and return related thoughts
      const relatedThoughts = searchData
        .filter((item: any) => item?.document)
        .map((item: any) => item.document.fields.text.stringValue);

      return {relatedThoughts};
    } catch (error) {
      console.error("Error fetching related thoughts:", error);
      throw new Error("Failed to fetch related thoughts.");
    }
  }
);
