"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Lock, User, ArrowRight, ShieldCheck, Server, Radio, Sparkles, KeyRound } from "lucide-react";
import { webApi, getRobotBaseUrl, setRobotBaseUrl } from "@/services/webApi";
import { useWebAuth } from "@/contexts/WebAuthContext";
import QuantumScene3D from "@/components/animations/QuantumScene3D";
import SymbioteButton from "@/components/ui/SymbioteButton";

export default function WebLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState("http://localhost:8226");
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useWebAuth();

  useEffect(() => {
    setServerUrl(getRobotBaseUrl());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setRobotBaseUrl(serverUrl);

    try {
      const res = await webApi.login({ username, password });
      login(res.token, res.username);
    } catch (err: any) {
      setError("AUTHENTICATION FAILED: INVALID CREDENTIALS OR NODE UNREACHABLE");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="web-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <QuantumScene3D isBusy={isLoading} isOnline={!error} />
      <div className="web-vignette" />

      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 26 }}
        className="holo-card-body"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "44px 38px",
          zIndex: 10,
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)",
          boxShadow: "0 25px 60px -15px rgba(37, 99, 235, 0.22), 0 0 0 1px #dbeafe",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Holographic Laser Sweeper */}
        <div className="cyber-hud-laser-beam" />

        {/* Hologram Corners */}
        <div className="holo-corner holo-corner-tl" style={{ opacity: 0.9, transform: "none" }} />
        <div className="holo-corner holo-corner-tr" style={{ opacity: 0.9, transform: "none" }} />
        <div className="holo-corner holo-corner-bl" style={{ opacity: 0.9, transform: "none" }} />
        <div className="holo-corner holo-corner-br" style={{ opacity: 0.9, transform: "none" }} />

        {/* LOGO & TITLE */}
        <div style={{ textAlign: "center", marginBottom: "32px", position: "relative", zIndex: 2 }}>
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="web-nav-icon"
            style={{
              width: "66px",
              height: "66px",
              borderRadius: "18px",
              margin: "0 auto 18px auto",
              boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.5)",
            }}
          >
            <Cpu size={32} />
          </motion.div>

          <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.6px" }}>
            Nexus <span style={{ background: "linear-gradient(135deg, #2563eb, #0284c7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Orchestrator</span>
          </h1>

          <div
            style={{
              marginTop: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              padding: "4px 12px",
              borderRadius: "99px",
              fontSize: "0.68rem",
              fontFamily: "'JetBrains Mono', monospace",
              color: "#2563eb",
              fontWeight: 800,
            }}
          >
            <ShieldCheck size={14} color="#2563eb" /> ENTERPRISE OPERATOR PORTAL
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fca5a5",
                color: "#dc2626",
                padding: "12px 16px",
                borderRadius: "14px",
                fontSize: "0.72rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                marginBottom: "20px",
                textAlign: "center",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.15)",
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "18px", position: "relative", zIndex: 2 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 800, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>
              OPERATOR ID
            </label>
            <div style={{ position: "relative" }}>
              <User size={16} color="#2563eb" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="web-input"
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 800, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>
              ACCESS CIPHER
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={16} color="#2563eb" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="web-input"
                style={{ paddingLeft: "42px" }}
              />
            </div>
          </div>

          {/* NODE CONFIGURATION ACCORDION */}
          <div>
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "0.72rem",
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: 0,
              }}
            >
              <Server size={13} /> {showServerConfig ? "[- HIDE ROBOT NODE IP]" : "[+ CONFIGURE TARGET ROBOT IP]"}
            </button>

            <AnimatePresence>
              {showServerConfig && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: "10px" }}
                >
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://10.10.10.50:8226"
                    className="web-input"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SUBMIT BUTTON */}
          <SymbioteButton
            type="submit"
            variant="blue"
            disabled={isLoading}
            style={{ width: "100%", marginTop: "10px", padding: "14px 20px" }}
          >
            {isLoading ? (
              <>
                <Radio size={16} className="animate-spin" /> SYNCHRONIZING SECURE TUNNEL...
              </>
            ) : (
              <>
                ACCESS CONTROL CENTER <ArrowRight size={16} />
              </>
            )}
          </SymbioteButton>
        </form>
      </motion.div>
    </div>
  );
}