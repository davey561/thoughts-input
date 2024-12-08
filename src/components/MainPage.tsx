import React, { useState, useEffect, useRef } from "react";
import "../App.css";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase/firebaseConfig";

const MainPage: React.FC<{ onThoughtSelect: (thought: string) => void }> = ({ onThoughtSelect }) => {
  const [thoughts, setThoughts] = useState<{ id: string; text: string }[]>([]);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [loadingThoughts, setLoadingThoughts] = useState<boolean>(true); // Thoughts loading state
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
        setLoadingThoughts(false); // Stop loading once thoughts are fetched
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
        await addDoc(collection(db, "thoughts"), {
          userId: auth.currentUser?.uid,
          text: currentThought,
          timestamp: serverTimestamp(),
        });

        // Autofocus on the submitted thought
        // onThoughtSelect(currentThought);

        setCurrentThought(""); // Clear the input box
      } catch (error) {
        console.error("Error saving thought:", error);
      }
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.preventDefault(); // Prevent default right-click menu
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
      {/* Render the input box */}
      <textarea
        ref={inputRef}
        value={currentThought}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu} // Add custom right-click logic
        placeholder="Express anything..."
        className={`thought-input ${isFocusedMode ? "focused" : ""}`}
        rows={1} // Initial number of rows
      />

      {/* Show loading state or thoughts if the input is empty */}
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
                  // onClick={() => {
                  //   onThoughtSelect(thought.text);
                  // }}
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
