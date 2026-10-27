"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: string | null;
  token: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function WebAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem("nexus_web_token");
    const storedUser = localStorage.getItem("nexus_web_user");
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      if (pathname === "/web/login") {
        router.push("/web/dashboard");
      }
    } else {
      if (pathname !== "/web/login") {
        router.push("/web/login");
      }
    }
    setIsInitialized(true);
  }, [pathname, router]);

  const login = (newToken: string, newUsername: string) => {
    localStorage.setItem("nexus_web_token", newToken);
    localStorage.setItem("nexus_web_user", newUsername);
    setToken(newToken);
    setUser(newUsername);
    router.push("/web/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("nexus_web_token");
    localStorage.removeItem("nexus_web_user");
    setToken(null);
    setUser(null);
    router.push("/web/login");
  };

  if (!isInitialized) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useWebAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useWebAuth must be used within a WebAuthProvider");
  }
  return context;
}