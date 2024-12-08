import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";

const MainPage: React.FC<{ onThoughtSelect: (thought: string) => void }> = ({ onThoughtSelect }) => {
  const [thoughts, setThoughts] = useState<{ id: string; text: string }[]>([]);
  const [currentThought, setCurrentThought] = useState<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Fetch thoughts from Firestore for the logged-in user
    const fetchThoughts = async () => {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "thoughts"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("timestamp", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedThoughts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as { id: string; text: string }[];

        setThoughts(fetchedThoughts);
      });

      return () => unsubscribe();
    };

    fetchThoughts();
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentThought(event.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto"; // Reset height
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`; // Set height to match content
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && currentThought.trim()) {
      event.preventDefault(); // Prevent line break

      try {
        const newThoughtRef = await addDoc(collection(db, "thoughts"), {
          userId: auth.currentUser?.uid,
          text: currentThought,
          timestamp: serverTimestamp(),
        });

        console.log("Thought saved successfully with ID:", newThoughtRef.id);

        // Navigate to the FocusedThoughtPage immediately after submission
        onThoughtSelect(currentThought);

        // Clear the input field
        setCurrentThought("");
      } catch (error) {
        console.error("Error saving thought:", error);
      }
    }
  };

  const isFocusedMode = currentThought.trim().length > 0;

  return (
    <div className={`App ${isFocusedMode ? "focused-mode" : ""}`}>
      <textarea
        ref={inputRef}
        value={currentThought}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Express anything..."
        className={`thought-input ${isFocusedMode ? "focused" : ""}`}
        rows={1} // Initial number of rows
      />
      {!isFocusedMode && (
        <div className="thought-list">
          {thoughts.map((thought) => (
            <div
              key={thought.id}
              className="thought-item"
              onClick={() => {
                onThoughtSelect(thought.text);
              }}
            >
              {thought.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MainPage;
