import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase/firebaseConfig";
import { generateEmbedding } from "../utils/openaiUtils"; // Adjust the import path as necessary

const MainPage: React.FC<{ onThoughtSelect: (thought: string) => void }> = ({
  onThoughtSelect,
}) => {
  const [thoughts, setThoughts] = useState<{ id: string; text: string }[]>([]);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [loadingThoughts, setLoadingThoughts] = useState<boolean>(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
        setLoadingThoughts(false);
      });

      return () => unsubscribe();
    };

    fetchThoughts();
  }, []);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setCurrentThought(event.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };
  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey && currentThought.trim()) {
      event.preventDefault();
  
      try {
        // Save the thought to Firestore immediately
        const docRef = await addDoc(collection(db, "thoughts"), {
          userId: auth.currentUser?.uid,
          text: currentThought,
          timestamp: serverTimestamp(),
        });
  
        // Navigate to the focused thought page immediately
        onThoughtSelect(currentThought);
  
        // Clear the input box
        setCurrentThought("");
  
        // Generate the embedding asynchronously
        generateEmbedding(currentThought)
          .then((embedding) => {
            console.log("Embedding generated:", embedding);
            // Update Firestore document with the embedding
            return updateDoc(doc(db, "thoughts", docRef.id), { embedding });
          })
          .catch((error) => {
            console.error("Error generating embedding:", error);
          });
      } catch (error) {
        console.error("Error saving thought:", error);
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const email = auth.currentUser?.email || "unknown user";

    if (window.confirm(`Wanna log out of ${email}?`)) {
      handleSignOut();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Signed out successfully!");
      // Redirect or trigger re-render if necessary
    } catch (error) {
      console.error("Error signing out:", error);
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
        onContextMenu={handleContextMenu}
        placeholder="Express anything..."
        className={`thought-input ${isFocusedMode ? "focused" : ""}`}
        rows={1}
      />

      {currentThought.trim().length === 0 && (
        <>
          {loadingThoughts ? (
            <div className="loading-thoughts">Loading thoughts...</div>
          ) : (
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
        </>
      )}
    </div>
  );
};

export default MainPage;
