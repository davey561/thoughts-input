import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase/firebaseConfig";

const MainPage: React.FC<{ onThoughtSelect: (thoughtId: string) => void }> = ({
  onThoughtSelect,
}) => {
  const [thoughts, setThoughts] = useState<{ id: string; text: string }[]>([]);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [loadingThoughts, setLoadingThoughts] = useState<boolean>(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch user's thoughts from Firestore
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

  // Adjust textarea height dynamically
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentThought(event.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  // Add new thought and save it to Firestore
  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey && currentThought.trim()) {
      event.preventDefault();

      try {
        // Save the new thought to Firestore
        const docRef = await addDoc(collection(db, "thoughts"), {
          userId: auth.currentUser?.uid,
          text: currentThought,
          timestamp: serverTimestamp(),
        });

        // Navigate to the focused thought page with the thought ID
        onThoughtSelect(docRef.id);

        // Clear the input box
        setCurrentThought("");
      } catch (error) {
        console.error("Error creating thought:", error);
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
                    onThoughtSelect(thought.id); // Pass thought ID
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
