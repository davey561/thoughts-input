import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig"; // Adjust your Firestore configuration path
import { doc, getDoc } from "firebase/firestore";
import "../App.css";

const FocusedThoughtPage: React.FC<{ thoughtId: string; onClose: () => void }> = ({
  thoughtId,
  onClose,
}) => {
  const [relatedThoughts, setRelatedThoughts] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentThoughtText, setCurrentThoughtText] = useState<string>("");

  useEffect(() => {
    const fetchRelatedThoughts = async () => {
      try {
        setLoading(true);

        // Step 1: Fetch the current thought's embedding and text using its ID
        const thoughtRef = doc(db, "thoughts", thoughtId);
        const thoughtSnapshot = await getDoc(thoughtRef);

        if (!thoughtSnapshot.exists()) {
          console.error("No thought document found for ID:", thoughtId);
          setLoading(false);
          return;
        }

        const thoughtData = thoughtSnapshot.data();
        const currentEmbedding = thoughtData.embedding;
        const currentText = thoughtData.text;

        setCurrentThoughtText(currentText);

        if (!currentEmbedding) {
          console.error("No embedding found for the thought ID:", thoughtId);
          setLoading(false);
          return;
        }

        // Step 2: Perform vector search using Firestore's REST API
        const response = await fetch(
          `https://firestore.googleapis.com/v1/projects/pastself/databases/(default)/documents:runQuery`,
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
                  topK: 5, // Top 5 most similar embeddings
                },
              },
            }),
          }
        );

        const data = await response.json();

        // Step 3: Safely extract and validate results
        const similarThoughts = data
          .filter((item: any) => item?.document?.fields?.text?.stringValue) // Check structure
          .map((item: any) => item.document.fields.text.stringValue)
          .filter((text: string) => text !== currentText); // Exclude the current thought itself

        console.log("Fetched related thoughts:", similarThoughts);
        setRelatedThoughts(similarThoughts);
      } catch (error) {
        console.error("Error fetching related thoughts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedThoughts();
  }, [thoughtId]);

  return (
    <div className="focused-thought-page">
      <button className="close-button" onClick={onClose}>
        Back
      </button>
      <div className="main-thought">
        <p>
          <strong>{currentThoughtText || "Loading..."}</strong>
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
