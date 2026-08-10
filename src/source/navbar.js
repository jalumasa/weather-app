import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "boxicons/css/boxicons.min.css";

const navLinkClasses = ({ isActive }) =>
  `rounded-[9999px] px-4 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-white/20 text-white"
      : "text-white/70 hover:bg-white/10 hover:text-white"
  }`;

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
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/20 bg-white/10 px-6 py-3 text-white backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2">
        <i className="bx bxs-cloud-rain text-2xl text-sky-300"></i>
        <span className="bg-gradient-to-r from-sky-300 via-white to-pop-400 bg-clip-text text-lg font-bold text-transparent">
          RainCoat
        </span>
      </Link>

      <div className="flex items-center gap-1">
        <NavLink to="/" end className={navLinkClasses}>
          Home
        </NavLink>
        <NavLink to="/favourites" className={navLinkClasses}>
          Favourite Cities
        </NavLink>
      </div>

      <div className="flex items-center gap-3">
        {currentUser ? (
          <>
            <i
              className="bx bxs-user rounded-[9999px] bg-white/10 p-1.5 text-lg"
              title={currentUser.email}
            ></i>
            <button
              onClick={handleLogout}
              className="rounded-[9999px] bg-pop-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-pop-600"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="rounded-[9999px] bg-pop-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-pop-600"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
