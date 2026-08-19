// App.js
import React from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/home";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import Navbar from "./source/navbar";

// The shell is a flat stage, dark or light depending on the reader. Any sense
// of weather or time of day comes from the canvas the dashboard paints behind
// itself, not from here - a global gradient could only ever reflect the
// viewer's clock, not the clock of whatever city they're actually looking at.
function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-ink-900">
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 1500,
                style: {
                  background: "var(--overlay)",
                  color: "var(--color-ink-100)",
                  border: "none",
                  fontSize: "0.8125rem",
                  borderRadius: "9999px",
                  padding: "0.5rem 0.9rem",
                  boxShadow: "var(--overlay-shadow)",
                },
              }}
            />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
