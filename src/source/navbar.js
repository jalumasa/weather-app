import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/*
  Deliberately almost nothing.

  A weather app has one page, so route links would be links to nowhere -
  switching location is the real navigation, and that lives inline on the
  dashboard. What's left is identity and account, which is roughly where the
  reference sites land too.
*/
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
    <nav className="relative z-30 flex items-center justify-between px-6 py-5">
      <Link
        to="/"
        className="text-small font-medium tracking-tight text-ink-100 transition-colors hover:text-white"
      >
        RainCoat
      </Link>

      {currentUser ? (
        <div className="flex items-center gap-3">
          <span
            title={currentUser.email}
            className="flex h-6 w-6 items-center justify-center rounded-[9999px] bg-white/[0.08] text-micro uppercase text-ink-200"
          >
            {currentUser.email.charAt(0)}
          </span>
          <button
            onClick={handleLogout}
            className="text-small text-ink-400 transition-colors hover:text-ink-100"
          >
            Sign out
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="text-small text-ink-400 transition-colors hover:text-ink-100"
        >
          Sign in
        </Link>
      )}
    </nav>
  );
}
