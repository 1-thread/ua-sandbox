"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutProvider } from "./LogoutContext";
import ProfileSelector from "./ProfileSelector";

const STORAGE_KEY = "ua-dashboard-auth";

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  const correctPassword =
    process.env.NEXT_PUBLIC_APP_PASSWORD || "demo123";

  useEffect(() => {
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
    // Redirect to landing page
    router.push("/");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black" style={{ backgroundColor: '#ffffff' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8" style={{ backgroundColor: '#ffffff' }}>
        <div className="w-full max-w-[400px] p-10 rounded-lg border border-[#e0e0e0] bg-white" style={{ backgroundColor: '#ffffff' }}>
          <h1 className="text-2xl font-semibold mb-2 text-black text-center">
            Password Required
          </h1>
          <p className="text-sm text-black/60 mb-6 text-center">
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
              className={`w-full px-4 py-3 rounded-lg border outline-none text-base mb-4 box-border ${
                error
                  ? "border-red-500 bg-red-50"
                  : "border-[#e0e0e0] bg-white text-black"
              }`}
            />

            {error && (
              <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 rounded-lg border-none bg-[#c9c9c9] hover:bg-[#b0b0b0] text-black text-base font-medium cursor-pointer transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <LogoutProvider handleLogout={handleLogout}>
      <ProfileSelector />
      {children}
    </LogoutProvider>
  );
}


