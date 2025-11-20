"use client";

import { createContext, useContext, ReactNode } from "react";

interface LogoutContextType {
  handleLogout: () => void;
}

const LogoutContext = createContext<LogoutContextType | undefined>(undefined);

export function useLogout() {
  const context = useContext(LogoutContext);
  if (!context) {
    throw new Error("useLogout must be used within LogoutProvider");
  }
  return context;
}

export function LogoutProvider({ children, handleLogout }: { children: ReactNode; handleLogout: () => void }) {
  return (
    <LogoutContext.Provider value={{ handleLogout }}>
      {children}
    </LogoutContext.Provider>
  );
}

