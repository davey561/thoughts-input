import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const App: React.FC = () => {
  const [thoughts, setThoughts] = useState<string[]>(() => {
    const savedThoughts = localStorage.getItem("thoughts");
    return savedThoughts ? JSON.parse(savedThoughts) : [];
  });
  const [currentThought, setCurrentThought] = useState<string>("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("thoughts", JSON.stringify(thoughts));
  }, [thoughts]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentThought(event.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto"; // Reset height
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`; // Set height to match content
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && currentThought.trim()) {
      event.preventDefault(); // Prevent line break
      setThoughts([currentThought, ...thoughts]);
      setCurrentThought("");
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
        placeholder="express a winding thought..."
        className={`thought-input ${isFocusedMode ? "focused" : ""}`}
        rows={1} // Initial number of rows
      />
      {!isFocusedMode && (
        <div className="thought-list">
          {thoughts.map((thought, index) => (
            <div key={index} className="thought-item">
              {thought}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
