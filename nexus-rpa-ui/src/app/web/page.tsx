"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { webApi, getRobotBaseUrl, setRobotBaseUrl } from "@/services/webApi";
import { Template, PlaybackStatus } from "@/types";
import { useWebAuth } from "@/contexts/WebAuthContext";
import InteractiveBackground from "@/components/animations/InteractiveBackground";
import SymbioteButton from "@/components/ui/SymbioteButton";
import HoloCard3D from "@/components/ui/HoloCard3D";
import CyberHUDTelemetry from "@/components/ui/CyberHUDTelemetry";
import Odometer from "@/components/ui/Odometer";
import Sparkline from "@/components/ui/Sparkline";
import { 
  Play, Pause, Square, Cpu, Layers, Activity, LogOut, Globe, Clock, 
  CheckCircle2, UserPlus, Send, X, Users, LayoutDashboard, Search, 
  Server, Trash2, Sparkles, RefreshCw, Timer, ListOrdered, Database,
  SlidersHorizontal, Terminal, ShieldAlert, Zap
} from "lucide-react";

export default function OrchestratorDashboard() {
  const { user, logout } = useWebAuth();
  const isAdmin = user?.toLowerCase() === "admin";

  const [activeTab, setActiveTab] = useState<"automations" | "users">("automations");
  const [filterType, setFilterType] = useState<"all" | "sequences" | "macros">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [allSystemTemplates, setAllSystemTemplates] = useState<Template[]>([]);
  const [usersList, setUsersList] = useState<string[]>([]);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);
  const [robotOnline, setRobotOnline] = useState<boolean>(true);

  const [robotUrlInput, setRobotUrlInput] = useState<string>("http://localhost:8226");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [dispatchTemplate, setDispatchTemplate] = useState<Template | null>(null);
  const [selectedTargetUsers, setSelectedTargetUsers] = useState<string[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);

  // Sparkline activity simulated trend data
  const templateSparklineData = useMemo(() => [4, 6, 8, 7, 9, 12, 11, 14, 15, templates.length || 6], [templates.length]);
  const queueSparklineData = useMemo(() => [0, 1, 0, 2, 1, 0, 3, 2, 1, playbackStatus?.queue?.length || 0], [playbackStatus?.queue?.length]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  useEffect(() => {
    setRobotUrlInput(getRobotBaseUrl());
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const myTemplates = await webApi.getTemplates();
      setTemplates(myTemplates);

      if (user.toLowerCase() === "admin") {
        const [usersData, sysTemplates] = await Promise.all([
          webApi.getUsers(),
          webApi.getAllSystemTemplates(),
        ]);
        setUsersList(usersData.filter((u) => u.toLowerCase() !== "admin"));
        setAllSystemTemplates(sysTemplates);
      }
    } catch (error) {
      console.error("Error loading orchestrator data:", error);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!user) return;
    let isTabActive = true;
    const onVisChange = () => { isTabActive = !document.hidden; };
    document.addEventListener("visibilitychange", onVisChange);

    const pollStatus = async () => {
      if (!isTabActive) return;
      try {
        const status = await webApi.getPlaybackStatus();
        setPlaybackStatus(status);
        setRobotOnline(true);
      } catch (e) {
        setRobotOnline(false);
        setPlaybackStatus(null);
      }
    };
    pollStatus();
    const interval = setInterval(pollStatus, 750);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [user]);

  const formatTimeEta = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "00m 00s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
    }
    return `${String(secs).padStart(2, "0")}s`;
  };

  const handleSaveRobotNodeUrl = () => {
    setRobotBaseUrl(robotUrlInput);
    setRobotUrlInput(getRobotBaseUrl());
    showToast(`ROBOT TARGET UPDATED -> ${getRobotBaseUrl()}`);
    loadData();
  };

  const handlePlayOrEnqueue = async (name: string) => {
    if (!robotOnline) {
      alert("Target Robot Machine is offline! Verify the Robot PC IP in the top bar.");
      return;
    }
    try {
      const res = await webApi.playTemplate(name);
      if (res.status === "QUEUED") {
        showToast(
          `QUEUED [#${res.queuePosition}] '${name}' — Starts in ~${formatTimeEta(res.estimatedWaitSeconds)}`
        );
      } else {
        showToast(`LAUNCHING '${name}' ON REMOTE DESKTOP`);
      }
    } catch (error) {
      alert("Failed to trigger automation on target robot.");
    }
  };

  const handleCancelQueuedJob = async (jobId: string) => {
    try {
      await webApi.cancelQueuedJob(jobId);
      showToast("Task removed from execution queue.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return alert("Please fill both username and password.");
    try {
      await webApi.register({ username: newUsername.trim(), password: newPassword.trim() });
      setNewUsername("");
      setNewPassword("");
      await loadData();
      showToast(`Operator profile '${newUsername}' created!`);
    } catch (error) {
      alert("Failed to create account. Username may already exist.");
    }
  };

  const handleDeleteUser = async (targetUser: string) => {
    if (!window.confirm(`Delete operator profile '${targetUser}' and revoke all their assigned templates?`)) return;
    try {
      await webApi.deleteUser(targetUser);
      await loadData();
      showToast(`Profile '${targetUser}' deleted.`);
    } catch (error) {
      alert("Failed to delete user.");
    }
  };

  const handleRevokeUserTemplate = async (templateId?: number) => {
    if (!templateId) return;
    try {
      await webApi.deleteTemplate(templateId);
      await loadData();
      showToast("Template access revoked.");
    } catch (error) {
      alert("Failed to revoke template.");
    }
  };

  const toggleSelectDispatchUser = (u: string) => {
    if (selectedTargetUsers.includes(u)) {
      setSelectedTargetUsers(selectedTargetUsers.filter((item) => item !== u));
    } else {
      setSelectedTargetUsers([...selectedTargetUsers, u]);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchTemplate?.id || selectedTargetUsers.length === 0) {
      return alert("Select at least one operator profile.");
    }
    setIsDispatching(true);
    try {
      for (const target of selectedTargetUsers) {
        await webApi.dispatchTemplate(dispatchTemplate.id, target);
      }
      await loadData();
      showToast(`Dispatched '${dispatchTemplate.name}' to ${selectedTargetUsers.length} operator(s)!`);
      setDispatchTemplate(null);
      setSelectedTargetUsers([]);
    } catch (error) {
      alert("Failed to dispatch template.");
    } finally {
      setIsDispatching(false);
    }
  };

  const handlePause = async () => { await webApi.pausePlayback(); };
  const handleResume = async () => { await webApi.resumePlayback(); };
  const handleStop = async () => { await webApi.stopPlayback(); };

  if (!user) return null;

  const isRobotBusy = Boolean(playbackStatus?.playing);
  const totalWaitSeconds = playbackStatus?.totalQueueWaitSeconds || playbackStatus?.remainingSeconds || 0;
  const queueList = playbackStatus?.queue || [];

  const filteredTemplates = templates.filter((t) => {
    const isMacro = t.name.startsWith("PROC_");
    if (filterType === "sequences" && isMacro) return false;
    if (filterType === "macros" && !isMacro) return false;
    if (searchQuery.trim() !== "" && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getUsersHavingTemplate = (templateName: string): string[] => {
    if (!isAdmin) return [];
    return allSystemTemplates
      .filter((t) => t.name === templateName && t.ownerUsername && t.ownerUsername.toLowerCase() !== "admin")
      .map((t) => t.ownerUsername!);
  };

  return (
    <div className="web-root">
      <InteractiveBackground isBusy={isRobotBusy} isOnline={robotOnline} />
      <div className="web-vignette" />

      {/* FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="web-toast-notification"
          >
            <Sparkles size={18} color="#2563eb" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP NAVIGATION — ELEVATED CYBER COMMAND DECK */}
      <nav className="web-nav">
        {/* Animated Hardware-Accelerated Laser Sweep Rail */}
        <div className="web-nav-laser-rail">
          <div className="web-nav-laser-beam" />
        </div>

        <div className="web-nav-logo">
          <div className="web-nav-icon-wrap">
            <div className="web-nav-icon-halo" />
            <div className="web-nav-icon">
              <Globe size={20} className="web-nav-globe" />
            </div>
            <span className="web-nav-status-indicator" />
          </div>
          <div className="web-nav-brand-text">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className="web-nav-title">
                Nexus <span className="web-nav-title-accent">Orchestrator</span>
              </h1>
              <span className="web-badge-pro">
                <span className="web-badge-pulse" />
                V3.4 • 144FPS
              </span>
            </div>
            <p className="web-nav-subtitle">
              Precision Robotic Fleet Engine • Active Orchestration Deck
            </p>
          </div>
        </div>

        <div className="web-nav-actions">
          {/* Cyber Node Capsule */}
          <div className="web-node-connector" title="Target Robot Node Host IP & Port">
            <div className="web-node-signal-wrap">
              <span className={`web-node-ping-ring ${robotOnline ? "ping-active" : "ping-error"}`} />
              <Server size={14} color="#2563eb" />
            </div>
            <span className="web-node-label">NODE:</span>
            <input
              type="text"
              value={robotUrlInput}
              onChange={(e) => setRobotUrlInput(e.target.value)}
              className="web-node-input"
              placeholder="http://10.10.10.50:8226"
            />
            <button
              type="button"
              className="web-node-sync-btn"
              onClick={handleSaveRobotNodeUrl}
              title="Synchronize Node Pipeline"
            >
              <Zap size={10} />
              <span>SYNC</span>
            </button>
          </div>

          {/* Cockpit Status Capsule */}
          <div className={`web-status-badge ${!robotOnline ? "is-offline" : isRobotBusy ? "is-busy" : "is-online"}`}>
            <span className="web-status-beacon">
              <span className="web-status-radar-ring" />
              <span className="web-dot-core" />
            </span>
            <div className="web-status-text-wrap">
              <span className="web-status-title">
                {!robotOnline
                  ? "SYSTEM OFFLINE"
                  : isRobotBusy
                  ? "ROBOT ACTIVE"
                  : "FLEET READY"}
              </span>
              <span className="web-status-sub">
                {!robotOnline
                  ? "LINK SEVERED"
                  : isRobotBusy
                  ? `ETA ${formatTimeEta(totalWaitSeconds)}`
                  : "LATENCY < 1ms"}
              </span>
            </div>
          </div>

          {/* Executive Operator Profile Capsule */}
          <div className="web-user-profile">
            <div className="web-avatar-ring">
              <div className="web-avatar">{user.charAt(0).toUpperCase()}</div>
              <span className="web-avatar-badge" />
            </div>
            <div className="web-user-info-text">
              <span className="web-user-name">{user}</span>
              <span className="web-role-tag">{isAdmin ? "SYS_ADMIN" : "OPERATOR"}</span>
            </div>
          </div>

          {/* Terminate Session Button */}
          <button
            type="button"
            className="web-nav-logout-btn"
            onClick={logout}
            title="Terminate Active Session"
          >
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      <main className="web-main">
        {/* BENTO KPI ROW WITH ODOMETER & SPARKLINES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="web-kpi-grid"
        >
          {/* KPI 1 */}
          <div className="web-kpi-card">
            <div>
              <div className="web-kpi-top">
                <div className="web-kpi-label">Registered Automations</div>
                <div className="web-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                  <Database size={22} />
                </div>
              </div>
              <div className="web-kpi-value">
                <Odometer value={templates.length} />
              </div>
            </div>
            <div className="web-kpi-sparkline-wrap">
              <Sparkline data={templateSparklineData} accent="#2563eb" />
            </div>
          </div>

          {/* KPI 2 */}
          <div className="web-kpi-card">
            <div>
              <div className="web-kpi-top">
                <div className="web-kpi-label">Workflows / Sub-Macros</div>
                <div className="web-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                  <Layers size={22} />
                </div>
              </div>
              <div className="web-kpi-value">
                <Odometer value={templates.filter((t) => !t.name.startsWith("PROC_")).length} />
                <span style={{ fontSize: "1.2rem", color: "#93c5fd", margin: "0 4px" }}>/</span>
                <span style={{ color: "#0284c7" }}>
                  <Odometer value={templates.filter((t) => t.name.startsWith("PROC_")).length} />
                </span>
              </div>
            </div>
            <div className="web-kpi-sparkline-wrap">
              <Sparkline data={[2, 3, 4, 3, 5, 4, 6, 5, 7, 6]} accent="#0284c7" />
            </div>
          </div>

          {/* KPI 3 */}
          <div className="web-kpi-card">
            <div>
              <div className="web-kpi-top">
                <div className="web-kpi-label">Next Available Execution Slot</div>
                <div className="web-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                  <Timer size={22} />
                </div>
              </div>
              <div className="web-kpi-value" style={{ color: isRobotBusy ? "#2563eb" : "#10b981", fontSize: "1.6rem" }}>
                {isRobotBusy ? `~${formatTimeEta(totalWaitSeconds)}` : "IMMEDIATE"}
              </div>
            </div>
            <div className="web-kpi-sparkline-wrap">
              <Sparkline data={[10, 8, 6, 7, 5, 4, 3, 2, 1, isRobotBusy ? 8 : 0]} accent={isRobotBusy ? "#2563eb" : "#10b981"} />
            </div>
          </div>

          {/* KPI 4 */}
          <div className="web-kpi-card">
            <div>
              <div className="web-kpi-top">
                <div className="web-kpi-label">Queued Buffer Jobs</div>
                <div className="web-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                  <ListOrdered size={22} />
                </div>
              </div>
              <div className="web-kpi-value">
                <Odometer value={queueList.length} />
              </div>
            </div>
            <div className="web-kpi-sparkline-wrap">
              <Sparkline data={queueSparklineData} accent="#3b82f6" />
            </div>
          </div>
        </motion.div>

        {/* LIVE HIGH-TECH HUD COCKPIT */}
        <AnimatePresence>
          {isRobotBusy && playbackStatus && (
            <CyberHUDTelemetry
              playbackStatus={playbackStatus}
              totalWaitSeconds={totalWaitSeconds}
              queueList={queueList}
              robotHost={getRobotBaseUrl()}
              isAdmin={isAdmin}
              currentUser={user}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onCancelQueueJob={handleCancelQueuedJob}
              formatTimeEta={formatTimeEta}
            />
          )}
        </AnimatePresence>

        {/* NAVIGATION & FILTER TOOLBAR */}
        <div className="web-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {isAdmin && (
              <div className="web-tabs-container">
                <button
                  onClick={() => setActiveTab("automations")}
                  className={`web-tab-item ${activeTab === "automations" ? "active" : ""}`}
                >
                  {activeTab === "automations" && (
                    <motion.div
                      layoutId="adminNavPill"
                      className="web-tab-pill-active"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <LayoutDashboard size={15} style={{ position: "relative", zIndex: 3 }} />
                  <span style={{ position: "relative", zIndex: 3 }}>TEMPLATES ({templates.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`web-tab-item ${activeTab === "users" ? "active" : ""}`}
                >
                  {activeTab === "users" && (
                    <motion.div
                      layoutId="adminNavPill"
                      className="web-tab-pill-active"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    />
                  )}
                  <Users size={15} style={{ position: "relative", zIndex: 3 }} />
                  <span style={{ position: "relative", zIndex: 3 }}>OPERATORS ({usersList.length})</span>
                </button>
              </div>
            )}

            {activeTab === "automations" && (
              <div className="web-tabs-container">
                {(["all", "sequences", "macros"] as const).map((ft) => {
                  const label = 
                    ft === "all" ? `ALL (${templates.length})` :
                    ft === "sequences" ? `WORKFLOWS (${templates.filter((t) => !t.name.startsWith("PROC_")).length})` :
                    `MACROS (${templates.filter((t) => t.name.startsWith("PROC_")).length})`;

                  return (
                    <button
                      key={ft}
                      onClick={() => setFilterType(ft)}
                      className={`web-tab-item ${filterType === ft ? "active" : ""}`}
                    >
                      {filterType === ft && (
                        <motion.div
                          layoutId="filterPill"
                          className="web-tab-pill-active"
                          transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        />
                      )}
                      <span style={{ position: "relative", zIndex: 3 }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="web-search-wrap">
            {activeTab === "automations" && (
              <div className="web-search-box">
                <Search size={15} color="#2563eb" />
                <input
                  type="text"
                  placeholder="Filter automation templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            <SymbioteButton variant="outline" onClick={loadData}>
              <RefreshCw size={13} /> REFRESH
            </SymbioteButton>
          </div>
        </div>

        {/* WORKFLOWS & MACROS BENTO GRID (WITH HOLOCARD3D) */}
        <AnimatePresence mode="wait">
          {activeTab === "automations" ? (
            <motion.div
              key="tab-automations"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="web-grid"
            >
              {filteredTemplates.map((template) => {
                const isMacro = template.name.startsWith("PROC_");
                const stepsList = template.steps || [];
                const duration = stepsList.reduce((acc, s) => acc + (s.delay || 0), 0);
                const assignedTo = getUsersHavingTemplate(template.name);
                const previewSteps = stepsList.slice(0, 3);

                return (
                  <HoloCard3D
                    key={template.id || template.name}
                    isMacro={isMacro}
                    glowColor={isMacro ? "rgba(14, 165, 233, 0.4)" : "rgba(37, 99, 235, 0.45)"}
                  >
                    <div>
                      {/* CARD HEADER */}
                      <div className="web-card-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className={`web-card-icon ${isMacro ? "macro" : "seq"}`}>
                            {isMacro ? <Layers size={20} /> : <Cpu size={20} />}
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: isMacro ? "#0284c7" : "#2563eb",
                                letterSpacing: "0.6px",
                              }}
                            >
                              {isMacro ? "SUB-ROUTINE MACRO" : "PRIMARY WORKFLOW"}
                            </span>
                            <div style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                              TEMPLATE ID: #{template.id || "SYS"}
                            </div>
                          </div>
                        </div>

                        {isAdmin && (
                          <SymbioteButton
                            variant="outline"
                            onClick={() => {
                              setDispatchTemplate(template);
                              setSelectedTargetUsers(assignedTo);
                            }}
                          >
                            <Send size={12} /> DISPATCH
                          </SymbioteButton>
                        )}
                      </div>

                      {/* CARD TITLE */}
                      <h3 className="web-card-title" title={template.name}>
                        {template.name}
                      </h3>

                      {/* META BADGES */}
                      <div className="web-card-meta">
                        <span className="web-meta-pill">
                          <CheckCircle2 size={13} color="#2563eb" /> {stepsList.length} Steps
                        </span>
                        <span className="web-meta-pill">
                          <Clock size={13} color="#0284c7" /> ~{formatTimeEta(duration)}
                        </span>
                      </div>

                      {/* STEP TELEMETRY PREVIEW */}
                      <div className="web-step-preview-box">
                        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", marginBottom: "3px" }}>
                          // EXECUTION TRACE
                        </div>
                        {previewSteps.map((st, sIdx) => (
                          <div key={sIdx} className="web-step-preview-row">
                            <span>
                              [{String(sIdx + 1).padStart(2, "0")}]{" "}
                              {st.type === "CLICK" ? `CLICK(${st.xCoordinate}, ${st.yCoordinate})` : st.actionName}
                            </span>
                            <span style={{ color: "#2563eb", fontWeight: 800 }}>{st.delay}s</span>
                          </div>
                        ))}
                        {stepsList.length > 3 && (
                          <div style={{ fontSize: "0.65rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace", marginTop: "2px" }}>
                            + {stepsList.length - 3} additional action frames...
                          </div>
                        )}
                      </div>

                      {/* ASSIGNED OPERATORS LIST */}
                      {isAdmin && (
                        <div className="web-assigned-users">
                          <span style={{ fontSize: "0.66rem", color: "#2563eb", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                            AUTHORIZED OPERATORS:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "flex-end" }}>
                            {assignedTo.length === 0 ? (
                              <span style={{ fontSize: "0.68rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                                Administrator Exclusive
                              </span>
                            ) : (
                              assignedTo.map((u) => (
                                <span key={u} className="web-user-chip">
                                  {u}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* LAUNCH TRIGGER BUTTON */}
                    <SymbioteButton
                      variant={isMacro ? "emerald" : "blue"}
                      onClick={() => handlePlayOrEnqueue(template.name)}
                      disabled={!robotOnline}
                      style={{ width: "100%" }}
                    >
                      {!robotOnline ? (
                        <>ROBOT DISCONNECTED</>
                      ) : isRobotBusy ? (
                        <>
                          <Timer size={15} /> ENQUEUE (STARTS IN ~{formatTimeEta(totalWaitSeconds)})
                        </>
                      ) : (
                        <>
                          <Play size={15} fill="currentColor" /> LAUNCH ON DESKTOP
                        </>
                      )}
                    </SymbioteButton>
                  </HoloCard3D>
                );
              })}
            </motion.div>
          ) : (
            /* USER & PROFILES TAB */
            <motion.div
              key="tab-users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="web-users-layout"
            >
              {/* CREATE PROFILE FORM */}
              <div className="web-kpi-card" style={{ height: "fit-content" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div className="web-card-icon seq">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900, color: "#0f172a" }}>
                      PROVISION OPERATOR
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                      Dispatch workflows to authenticated staff
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 800, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>
                      USERNAME
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="web-input"
                      placeholder="e.g. operator.kyntus"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 800, color: "#2563eb", fontFamily: "'JetBrains Mono', monospace", marginBottom: "6px" }}>
                      PASSWORD
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="web-input"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <SymbioteButton type="submit" variant="blue" style={{ width: "100%", marginTop: "8px" }}>
                    <UserPlus size={15} /> AUTHORIZE OPERATOR
                  </SymbioteButton>
                </form>
              </div>

              {/* OPERATORS DIRECTORY */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {usersList.length === 0 ? (
                  <div className="web-kpi-card" style={{ textAlign: "center", padding: "50px 20px" }}>
                    <Users size={40} color="#2563eb" style={{ margin: "0 auto 12px auto" }} />
                    <h4 style={{ margin: "0 0 6px 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>
                      NO OPERATORS PROVISIONED
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                      Create an operator profile on the left to start assigning automation templates.
                    </p>
                  </div>
                ) : (
                  usersList.map((u) => {
                    const userTemplates = allSystemTemplates.filter(
                      (t) => t.ownerUsername?.toLowerCase() === u.toLowerCase()
                    );

                    return (
                      <div key={u} className="web-user-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div className="web-avatar" style={{ width: "42px", height: "42px", fontSize: "1rem" }}>
                            {u.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>
                                {u}
                              </span>
                              <span className="web-role-tag">OPERATOR</span>
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>
                              {userTemplates.length} Dispatched Automation Template(s)
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <SymbioteButton
                            variant="danger"
                            onClick={() => handleDeleteUser(u)}
                            title="Delete Operator Profile"
                            style={{ width: "38px", height: "38px", padding: 0, borderRadius: "10px" }}
                          >
                            <Trash2 size={16} />
                          </SymbioteButton>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* DISPATCH TO OPERATORS MODAL */}
      <AnimatePresence>
        {dispatchTemplate && (
          <div className="web-modal-backdrop">
            <motion.div
              initial={{ scale: 0.9, y: 25, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 25, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="web-modal-shell"
            >
              <div className="web-modal-laser" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Send size={18} color="#2563eb" /> DISPATCH WORKFLOW
                </h3>
                <button
                  onClick={() => setDispatchTemplate(null)}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px 16px", borderRadius: "16px" }}>
                  <div style={{ fontSize: "0.65rem", color: "#2563eb", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                    TARGET WORKFLOW
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", marginTop: "2px" }}>
                    {dispatchTemplate.name} ({dispatchTemplate.steps?.length || 0} steps)
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                  Select the operators authorized to execute this automation on their machines:
                </p>

                {usersList.length === 0 ? (
                  <div style={{ padding: "16px", background: "#fef2f2", borderRadius: "12px", textAlign: "center", fontSize: "0.8rem", color: "#dc2626" }}>
                    No operator profiles exist. Create an operator in "OPERATORS" tab first!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                    {usersList.map((u) => {
                      const isChecked = selectedTargetUsers.includes(u);
                      return (
                        <div
                          key={u}
                          onClick={() => toggleSelectDispatchUser(u)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderRadius: "14px",
                            background: isChecked ? "#eff6ff" : "#f8fafc",
                            border: isChecked ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div className="web-avatar" style={{ width: "30px", height: "30px", fontSize: "0.78rem" }}>
                              {u.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{u}</span>
                          </div>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 900,
                              color: isChecked ? "#2563eb" : "#64748b",
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {isChecked ? "[AUTHORIZED ✓]" : "[CLICK TO SELECT]"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <SymbioteButton
                  variant="blue"
                  onClick={handleConfirmDispatch}
                  disabled={isDispatching || selectedTargetUsers.length === 0}
                  style={{ width: "100%", marginTop: "10px" }}
                >
                  <Send size={15} />
                  {isDispatching
                    ? "DISPATCHING ACROSS FLEET..."
                    : `DISPATCH TO ${selectedTargetUsers.length} OPERATOR(S)`}
                </SymbioteButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}