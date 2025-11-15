"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "ua-contributor-auth";

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  // Get password from env var or use a default
  const correctPassword =
    process.env.NEXT_PUBLIC_APP_PASSWORD || "demo123";

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem(STORAGE_KEY);
    if (authStatus === "authenticated") {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password === correctPassword) {
      localStorage.setItem(STORAGE_KEY, "authenticated");
      setIsAuthenticated(true);
      setPassword("");
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
    setPassword("");
    setError("");
  };

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#f9fafb",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // Show password gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: "32px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "40px",
            borderRadius: 16,
            background:
              "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,64,175,0.35))",
            border: "1px solid #1f2937",
            boxShadow:
              "0 12px 30px rgba(15,23,42,0.7), 0 0 0 1px rgba(148,163,184,0.1)",
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 8,
              color: "#f9fafb",
              textAlign: "center",
            }}
          >
            Password Required
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#9ca3af",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Please enter the password to access this application.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter password"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: error ? "1px solid #f97373" : "1px solid #1f2937",
                background: "#020617",
                color: "#f9fafb",
                outline: "none",
                fontSize: 16,
                marginBottom: error ? 8 : 16,
                boxSizing: "border-box",
              }}
            />

            {error && (
              <p
                style={{
                  color: "#f97373",
                  fontSize: 14,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(145deg, rgba(30,64,175,0.8), rgba(59,130,246,0.6))",
                color: "#f9fafb",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show main content with logout button if authenticated
  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #1f2937",
            background: "#020617",
            color: "#f9fafb",
            fontSize: 14,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#1f2937";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#020617";
          }}
        >
          Logout
        </button>
      </div>
      {children}
    </>
  );
}

