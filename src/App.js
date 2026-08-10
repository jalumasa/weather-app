// App.js
import axios from "axios";
import React from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import Favourites from "./pages/favourites";
import Home from "./pages/home";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import Navbar from "./source/navbar"

axios.defaults.baseURL = "/api/";

// Same day/night atmosphere used by the weather card, hoisted so every page
// (not just the dashboard) sits on the right gradient.
const currentHour = new Date().getHours();
const isDaytime = currentHour >= 6 && currentHour < 18;

function App() {
  return (
    <div
      className={`min-h-screen ${
        isDaytime ? "bg-gradient-day" : "bg-gradient-night"
      }`}
    >
      <AuthProvider>
        <BrowserRouter>
          <Navbar/>
          <Toaster position="top-right" toastOptions={{ duration: 1500 }} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/favourites" element={<Favourites />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;

