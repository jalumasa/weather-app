import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../source/firebase";
import "react-toastify/dist/ReactToastify.css";
import toast from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("You have logged in");
      setTimeout(() => {
        navigate("/");
      });
    } catch (error) {
      setError(
        "Failed to log in. Please check your credentials and try again."
      );
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-12">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-md p-8">
        <h2 className="mb-6 text-3xl font-bold text-white">Login</h2>

        {error && (
          <p className="mb-4 rounded-lg border border-pop-500/40 bg-pop-500/20 px-3 py-2 text-sm text-pop-400">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-cy="email-input"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-white placeholder-white/50 outline-none transition focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/40"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-cy="password-input"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-white placeholder-white/50 outline-none transition focus:border-sky-300 focus:bg-white/15 focus:ring-2 focus:ring-sky-300/40"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-pop-500 px-4 py-2.5 font-semibold text-white transition hover:opacity-90 active:scale-[0.99]"
        >
          Login
        </button>

        <p className="mt-4 text-center text-sm text-white/70">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-sky-300 hover:text-sky-200"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
