import OpenAI from 'openai';

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY, // Ensure your API key is stored in an environment variable
dangerouslyAllowBrowser: true,
});

/**
 * Generates an embedding for the provided text using OpenAI's API.
 *
 * @param {string} text - The input text to generate an embedding for.
 * @returns {Promise<number[]>} - A promise that resolves to the embedding vector.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};
