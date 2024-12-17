import React, { useState, useEffect } from "react";
import {
  useNavigate,
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import MainPage from "./components/MainPage";
import FocusedThoughtPage from "./components/FocusedThoughtPage";
import SignInPage from "./components/SignIn";
import { auth } from "./firebase/firebaseConfig";

const App: React.FC = () => {
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(
    null
  );
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true); // Auth loading state
  const [user, setUser] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoadingAuth(false); // Stop loading once auth state is determined
    });

    return () => unsubscribe();
  }, []);

  // Handle when a thought is selected
  const handleThoughtSelect = (thoughtId: string) => {
    setSelectedThoughtId(thoughtId);
    navigate("/focused-thought");
  };

  // Handle when focused thought page is closed
  const handleCloseFocusedThought = () => {
    setSelectedThoughtId(null);
    navigate("/");
  };

  // Component to guard routes
  const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
    if (loadingAuth) {
      return <div className="loading-screen">Loading...</div>;
    }
    if (!user) {
      return <Navigate to="/sign-in" replace />;
    }
    return children;
  };

  return (
    <Routes>
      {/* Public Route for Sign In */}
      <Route path="/sign-in" element={<SignInPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainPage onThoughtSelect={handleThoughtSelect} />
          </RequireAuth>
        }
      />
      <Route
        path="/focused-thought"
        element={
          <RequireAuth>
            <FocusedThoughtPage
              thoughtId={selectedThoughtId || ""}
              onClose={handleCloseFocusedThought}
            />
          </RequireAuth>
        }
      />
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
