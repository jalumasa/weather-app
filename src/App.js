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

function App() {
  return (
    <div>
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

