"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface WebAuthContextType {
  user: string | null;
  token: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
}

const WebAuthContext = createContext<WebAuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const WebAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedToken = localStorage.getItem("nexus_web_token");
    const savedUser = localStorage.getItem("nexus_web_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!user && pathname !== "/web/login") {
      router.push("/web/login");
    } else if (user && pathname === "/web/login") {
      router.push("/web");
    }
  }, [user, pathname, initialized, router]);

  const login = (newToken: string, newUsername: string) => {
    localStorage.setItem("nexus_web_token", newToken);
    localStorage.setItem("nexus_web_user", newUsername);
    setToken(newToken);
    setUser(newUsername);
    router.push("/web");
  };

  const logout = () => {
    localStorage.removeItem("nexus_web_token");
    localStorage.removeItem("nexus_web_user");
    setToken(null);
    setUser(null);
    router.push("/web/login");
  };

  return (
    <WebAuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </WebAuthContext.Provider>
  );
};

export const useWebAuth = () => useContext(WebAuthContext);