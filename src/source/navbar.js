import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "boxicons/css/boxicons.min.css";

export default function Navbar() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <nav
      style={{
        backgroundColor: "#f0f0f0",
        padding: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {currentUser ? (
        <div>
          <Link
            style={{
              marginRight: "10px",
              color: "#333",
              textDecoration: "none",
            }}
            to="/"
          >
            Home
          </Link>
          <Link
            style={{
              marginRight: "10px",
              color: "#333",
              textDecoration: "none",
            }}
            to="/favourites"
          >
            Favourite Cities
          </Link>
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center" }}>
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <i
              className="bx bxs-user"
              style={{
                fontSize: "24px",
                marginRight: "10px",
                cursor: "pointer",
              }}
              title={currentUser.email}
            ></i>
            <button
              onClick={handleLogout}
              style={{
                marginLeft: "10px",
                backgroundColor: "transparent",
                border: "none",
                color: "#333",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link style={{ color: "#333", textDecoration: "none" }} to="/login">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
