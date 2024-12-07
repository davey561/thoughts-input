import React, { useEffect, useState } from "react";
import "../App.css";

const FocusedThoughtPage: React.FC<{ thought: string; onClose: () => void }> = ({ thought, onClose }) => {
  const [relatedThoughts, setRelatedThoughts] = useState<string[]>([]);

  useEffect(() => {
    // Simulate fetching related thoughts from Pinecone
    const fetchRelatedThoughts = async () => {
      const storedThoughts = JSON.parse(localStorage.getItem("thoughts") || "[]");
      const filteredThoughts = storedThoughts.filter((t: string) => t !== thought);
      // In practice, integrate Pinecone or similar service here to find semantically related thoughts
      setRelatedThoughts(filteredThoughts.slice(0, 5)); // Show up to 5 dummy related thoughts
    };
    fetchRelatedThoughts();
  }, [thought]);

  return (
    <div className="focused-thought-page">
      <button className="close-button" onClick={onClose}>Back</button>
      <div className="main-thought">
        <p><strong>{thought}</strong></p>
      </div>
      <div className="related-thoughts-row">
        {relatedThoughts.map((relatedThought, index) => (
          <div key={index} className="related-thought-item">
            {relatedThought}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusedThoughtPage;
