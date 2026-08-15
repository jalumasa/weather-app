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
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h2 className="mb-8 text-body font-medium text-ink-100">Login</h2>

        {error && (
          <p className="mb-5 text-small text-ink-300">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-micro uppercase tracking-[0.14em] text-ink-400">
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
            className="w-full rounded-[14px] bg-[var(--field)] px-4 py-2.5 text-small text-ink-100 placeholder-ink-500 outline-none transition-colors focus:bg-[var(--state-active)]"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-micro uppercase tracking-[0.14em] text-ink-400">
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
            className="w-full rounded-[14px] bg-[var(--field)] px-4 py-2.5 text-small text-ink-100 placeholder-ink-500 outline-none transition-colors focus:bg-[var(--state-active)]"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-[14px] bg-ink-100 px-4 py-2.5 text-small font-medium text-ink-900 transition-opacity hover:opacity-85 active:scale-[0.99]"
        >
          Login
        </button>

        <p className="mt-6 text-center text-small text-ink-400">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-ink-100 underline underline-offset-4 transition-colors hover:text-ink-100"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
