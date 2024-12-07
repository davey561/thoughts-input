import React, { useState } from "react";
import { useNavigate, BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./components/MainPage";
import FocusedThoughtPage from "./components/FocusedThoughtPage";

import { auth } from './firebase/firebaseConfig';



const App: React.FC = () => {
  const [selectedThought, setSelectedThought] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleThoughtSelect = (thought: string) => {
    setSelectedThought(thought);
    navigate("/focused-thought");
  };

  const handleCloseFocusedThought = () => {
    setSelectedThought(null);
    navigate("/");
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
