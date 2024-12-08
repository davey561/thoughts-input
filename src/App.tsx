import React, { useState } from "react";
import { useNavigate, BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";
import FocusedThoughtPage from "./components/FocusedThoughtPage";

const App: React.FC = () => {
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleThoughtSelect = (thought: string) => {
    console.log("Selected thought:", thought); // Debug log
    setSelectedThought(thought);
    navigate("/focused-thought"); // Navigate to FocusedThoughtPage
  };

  const handleCloseFocusedThought = () => {
    console.log("Closing FocusedThoughtPage");
    setSelectedThought(null);
    navigate("/"); // Navigate back to MainPage
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<MainPage onThoughtSelect={handleThoughtSelect} />}
      />
      {selectedThought && (
        <Route
          path="/focused-thought"
          element={
            <FocusedThoughtPage
              thought={selectedThought}
              onClose={handleCloseFocusedThought}
            />
          }
        />
      )}
    </Routes>
  );
};

const Root: React.FC = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default Root;
