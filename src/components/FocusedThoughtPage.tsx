import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig"; // Adjust your Firestore configuration path
import { collection, query, where, getDocs, runTransaction } from "firebase/firestore";
import "../App.css";

const FocusedThoughtPage: React.FC<{ thought: string; onClose: () => void }> = ({ thought, onClose }) => {
  const [relatedThoughts, setRelatedThoughts] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRelatedThoughts = async () => {
      try {
        setLoading(true);

        // Step 1: Fetch the embedding of the current thought
        const thoughtsCollection = collection(db, "thoughts");
        const currentThoughtSnapshot = await getDocs(
          query(thoughtsCollection, where("text", "==", thought))
        );

        if (currentThoughtSnapshot.empty) {
          console.error("No thought found for:", thought);
          setLoading(false);
          return;
        }

        const currentEmbedding = currentThoughtSnapshot.docs[0].data().embedding;

        if (!currentEmbedding) {
          console.error("No embedding found for the thought");
          setLoading(false);
          return;
        }

        // Step 2: Perform the vector search
        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents:runQuery`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: "thoughts" }],
                vectorSearch: {
                  field: "embedding",
                  queryVector: currentEmbedding,
                  topK: 5, // Fetch top 5 related thoughts
                },
              },
            }),
          }
        );

        const data = await response.json();

        // Step 3: Extract and format the related thoughts
        const similarThoughts = data
          .map((doc: any) => doc.document.fields.text.stringValue)
          .filter((text: string) => text !== thought); // Exclude the current thought itself

        setRelatedThoughts(similarThoughts);
      } catch (error) {
        console.error("Error fetching related thoughts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedThoughts();
  }, [thought]);

  return (
    <div className="focused-thought-page">
      <button className="close-button" onClick={onClose}>
        Back
      </button>
      <div className="main-thought">
        <p>
          <strong>{thought}</strong>
        </p>
      </div>

      {loading ? (
        <div>Loading related thoughts...</div>
      ) : (
        <div className="related-thoughts-row">
          {relatedThoughts.length > 0 ? (
            relatedThoughts.map((relatedThought, index) => (
              <div key={index} className="related-thought-item">
                {relatedThought}
              </div>
            ))
          ) : (
            <div>No related thoughts found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FocusedThoughtPage;
