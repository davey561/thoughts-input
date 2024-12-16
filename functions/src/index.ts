import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
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
