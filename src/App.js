// App.js
import axios from "axios";
import React from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/home";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import Navbar from "./source/navbar"

axios.defaults.baseURL = "/api/";

// The shell is a flat near-black stage. Any sense of weather or time of day
// comes from the canvas the dashboard paints behind itself, not from here -
// a global gradient could only ever reflect the viewer's clock, not the
// clock of whatever city they're actually looking at.
function App() {
  return (
    <div className="min-h-screen bg-ink-900">
      <AuthProvider>
        <BrowserRouter>
          <Navbar/>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 1500,
              style: {
                background: "#161616",
                color: "#e4e4e7",
                border: "none",
                fontSize: "0.8125rem",
                borderRadius: "9999px",
                padding: "0.5rem 0.9rem",
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
  );
}

export default App;

