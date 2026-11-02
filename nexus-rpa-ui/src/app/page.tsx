"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { rpaApi } from "../services/api";
import { Template, Step } from "../types";
import {
  Minus, X, Maximize2, Play, Pause, Square, Cpu, GripHorizontal,
  Target, Layers, PlayCircle, Combine, CheckSquare, Square as SquareIcon,
  Globe, ArrowRight, Code2, Search, Activity, Zap
} from "lucide-react";
import Button from "../components/ui/Button";
import InteractiveBackground from "../components/animations/InteractiveBackground";
import TemplateCard from "../components/features/TemplateCard";
import RecordingOverlay from "../components/features/RecordingOverlay";
import PlaybackOverlay from "../components/features/PlaybackOverlay";
import StepEditor from "../components/features/StepEditor";
import HeroSection from "../components/features/HeroSection";
import EditorHeader from "../components/features/EditorHeader";
import BatchModal from "../components/features/BatchModal";
import { usePlaybackStatus } from "../hooks/usePlaybackStatus";

// ───────────────────────── helpers (hoisted: created once) ─────────────────────────
const formatSeconds = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Re-index steps, keeping object identity for steps whose index didn't change
 *  (lets the memoized StepEditor rows skip re-rendering). */
const reindex = (steps: Step[]) =>
  steps.map((s, i) => (s.orderIndex === i ? s : { ...s, orderIndex: i }));

const MemoBackground = memo(InteractiveBackground);

export default function Dashboard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [recordedSteps, setRecordedSteps] = useState<Step[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [recordingType, setRecordingType] = useState<"sequence" | "macro">("sequence");

  const [selectedTemplateNames, setSelectedTemplateNames] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [templateUrls, setTemplateUrls] = useState<{ [name: string]: string }>({});

  // Only re-renders when the visible playback data actually changes
  const [playbackStatus, pokeStatus] = usePlaybackStatus();

  // WIDGET / SHORTCUT STATES
  const [isWidgetMode, setIsWidgetMode] = useState(false);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [widgetTab, setWidgetTab] = useState<"sequences" | "macros">("sequences");
  const [widgetSearch, setWidgetSearch] = useState("");

  const [isSniperMode, setIsSniperMode] = useState(false);
  const [sniperCountdown, setSniperCountdown] = useState(0);

  const [batchTemplateTarget, setBatchTemplateTarget] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"sequences" | "macros">("sequences");

  const loadTemplates = useCallback(async () => {
    try {
      const data = await rpaApi.getTemplates();
      setTemplates(data);
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleDeleteTemplate = useCallback(async (id: number) => {
    if (window.confirm("Are you sure you want to delete this automation?")) {
      try {
        await rpaApi.deleteTemplate(id);
        loadTemplates();
      } catch (error) {
        console.error("Failed to delete template:", error);
      }
    }
  }, [loadTemplates]);

  const toggleSelectTemplate = useCallback((name: string) => {
    setSelectedTemplateNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }, []);

  const { sequences, macros } = useMemo(() => ({
    sequences: templates.filter(t => !t.name.startsWith("PROC_")),
    macros: templates.filter(t => t.name.startsWith("PROC_")),
  }), [templates]);

  const selectedSet = useMemo(() => new Set(selectedTemplateNames), [selectedTemplateNames]);

  const selectAllSequences = () => {
    const seqNames = sequences.map(s => s.name);
    setSelectedTemplateNames(selectedTemplateNames.length === seqNames.length ? [] : seqNames);
  };

  const handleOpenMergeModal = () => {
    if (selectedTemplateNames.length < 2) {
      alert("Please select at least 2 templates to merge.");
      return;
    }
    const initialUrls: { [name: string]: string } = {};
    selectedTemplateNames.forEach(name => {
      initialUrls[name] = templateUrls[name] || "";
    });
    setTemplateUrls(initialUrls);
    setShowMergeModal(true);
  };

  const handleConfirmMerge = () => {
    const mergedSteps: Step[] = [];
    let currentOrder = 0;

    selectedTemplateNames.forEach((name, tIdx) => {
      const t = templates.find(temp => temp.name === name);
      if (!t || !t.steps) return;

      const targetUrl = templateUrls[name]?.trim();

      if (targetUrl && targetUrl.length > 0) {
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "CTRL_SHIFT_N", delay: 2.0 });
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "CTRL_L", delay: 1.0 });
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "TYPE_TEXT", parameter: targetUrl, delay: 1.0 });
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "ENTER", delay: 4.0 });
      }

      t.steps.forEach(step => {
        mergedSteps.push({ ...step, orderIndex: currentOrder++ });
      });

      if (tIdx < selectedTemplateNames.length - 1) {
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "ALT_F4", delay: 1.5 });
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "TYPE_N", delay: 1.0 });
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "CTRL_W", delay: 1.0 });
        mergedSteps.push({ orderIndex: currentOrder++, type: "ACTION", actionName: "ALT_TAB", delay: 1.5 });
      }
    });

    setTemplateName("PIPELINE_" + selectedTemplateNames.map(n => n.substring(0, 6)).join("_"));
    setRecordingType("sequence");
    setRecordedSteps(mergedSteps);
    setShowMergeModal(false);
    setSelectedTemplateNames([]);
  };

  // DYNAMIC TAURI WINDOW RESIZE FOR SHORTCUT MODE
  const isPlaying = !!playbackStatus?.playing;
  useEffect(() => {
    if (!isWidgetMode) return;
    const resizeWidget = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const { LogicalSize } = await import("@tauri-apps/api/dpi");
        const appWindow = getCurrentWindow();

        if (isSniperMode) {
          await appWindow.setSize(new LogicalSize(280, 95));
          await appWindow.center();
        } else if (showWidgetMenu) {
          await appWindow.setSize(new LogicalSize(360, 580));
        } else if (isPlaying) {
          await appWindow.setSize(new LogicalSize(210, 115));
        } else {
          await appWindow.setSize(new LogicalSize(110, 115));
        }
      } catch (e) {}
    };
    resizeWidget();
  }, [showWidgetMenu, isWidgetMode, isSniperMode, isPlaying]);

  const minimizeToWidget = useCallback(async () => {
    setIsWidgetMode(true);
    setShowWidgetMenu(false);
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { LogicalSize, LogicalPosition } = await import("@tauri-apps/api/dpi");
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(110, 115));
      await appWindow.setPosition(new LogicalPosition(40, 40));
      await appWindow.setAlwaysOnTop(true);
    } catch (e) {}
  }, []);

  const maximizeApp = useCallback(async () => {
    setIsWidgetMode(false);
    setShowWidgetMenu(false);
    setIsSniperMode(false);
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { LogicalSize } = await import("@tauri-apps/api/dpi");
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(1280, 840));
      await appWindow.setAlwaysOnTop(false);
      setTimeout(async () => { await appWindow.center(); await appWindow.setFocus(); }, 100);
    } catch (e) {}
  }, []);

  const closeApp = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch (e) {}
  };

  const handleSniperMode = useCallback(async (stepIndex: number) => {
    setIsSniperMode(true);
    await minimizeToWidget();

    setSniperCountdown(3);
    let count = 3;

    const timer = setInterval(async () => {
      count -= 1;
      setSniperCountdown(count);

      if (count <= 0) {
        clearInterval(timer);
        try {
          const coords = await rpaApi.captureSingleClick();
          setRecordedSteps(prev => {
            const next = [...prev];
            if (next[stepIndex]) {
              next[stepIndex] = { ...next[stepIndex], xCoordinate: coords.x, yCoordinate: coords.y };
            }
            return next;
          });
        } catch (error) {
          console.error("Sniper capture failed", error);
        } finally {
          await maximizeApp();
        }
      }
    }, 1000);
  }, [minimizeToWidget, maximizeApp]);

  const handleStartRecording = (type: "sequence" | "macro") => {
    setRecordingType(type);
    setRecordedSteps([]);
    setCountdown(5);
    const timer = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          rpaApi.startRecording().catch(console.error);
          setIsRecording(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleWidgetStartRecording = async (type: "sequence" | "macro") => {
    await maximizeApp();
    setTimeout(() => { handleStartRecording(type); }, 350);
  };

  const handleStopRecording = async () => {
    try {
      const steps = await rpaApi.stopRecording();
      setRecordedSteps(steps);
    } catch (error) { console.error(error); }
    finally { setIsRecording(false); }
  };

  const handleSaveTemplate = async () => {
    let finalName = templateName.trim();
    if (!finalName) return alert("Enter a name.");

    if (recordingType === "macro" && !finalName.startsWith("PROC_")) {
      finalName = "PROC_" + finalName;
    }

    try {
      await rpaApi.saveTemplate({ name: finalName, steps: recordedSteps });
      setRecordedSteps([]); setTemplateName(""); loadTemplates();
    } catch (error) { console.error(error); }
  };

  const handleEditTemplate = useCallback((template: Template) => {
    setTemplateName(template.name);
    setRecordingType(template.name.startsWith("PROC_") ? "macro" : "sequence");
    const safeSteps = template.steps || [];
    setRecordedSteps(safeSteps.map(step => ({ ...step })));
  }, []);

  const handlePlayTemplate = useCallback(async (name: string) => {
    try {
      await rpaApi.playTemplate(name);
      pokeStatus();
    } catch (error) {
      console.error("Playback failed to start", error);
    }
  }, [pokeStatus]);

  const handleStartBatch = async (filePaths: string[]) => {
    if (!batchTemplateTarget) return;
    try {
      setBatchTemplateTarget(null);
      await rpaApi.playBatchTemplate(batchTemplateTarget, filePaths);
      pokeStatus();
    } catch (error) {
      console.error("Batch playback failed", error);
    }
  };

  const handlePause = useCallback(async () => { await rpaApi.pausePlayback(); pokeStatus(); }, [pokeStatus]);
  const handleResume = useCallback(async () => { await rpaApi.resumePlayback(); pokeStatus(); }, [pokeStatus]);
  const handleStop = useCallback(async () => { await rpaApi.stopPlayback(); pokeStatus(); }, [pokeStatus]);

  // ───────── Step editor handlers: stable identities + functional updates ─────────
  const handleUpdateStep = useCallback((index: number, field: keyof Step, value: any) => {
    setRecordedSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleMoveStep = useCallback((index: number, direction: "up" | "down") => {
    setRecordedSteps(prev => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return reindex(next);
    });
  }, []);

  const handleDuplicateStep = useCallback((index: number) => {
    setRecordedSteps(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, { ...prev[index] });
      return reindex(next);
    });
  }, []);

  const handleMoveStepToPosition = useCallback((fromIndex: number, targetPosition: number) => {
    setRecordedSteps(prev => {
      const toIndex = targetPosition - 1;
      if (fromIndex === toIndex || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return reindex(next);
    });
  }, []);

  const handleAddAction = useCallback((type: "CLICK" | "ACTION", atIndex?: number) => {
    const newStep: Step = type === "CLICK"
      ? { orderIndex: 0, type: "CLICK", delay: 2.0, xCoordinate: 0, yCoordinate: 0 }
      : { orderIndex: 0, type: "ACTION", actionName: "CTRL_A", delay: 2.0 };

    setRecordedSteps(prev => {
      const next = [...prev];
      if (atIndex !== undefined && atIndex >= 0 && atIndex <= next.length) next.splice(atIndex, 0, newStep);
      else next.push(newStep);
      return reindex(next);
    });
  }, []);

  const handleRemoveStep = useCallback((index: number) => {
    setRecordedSteps(prev => reindex(prev.filter((_, i) => i !== index)));
  }, []);

  const filteredWidgetItems = useMemo(() => {
    const q = widgetSearch.toLowerCase();
    return (widgetTab === "sequences" ? sequences : macros).filter(t => t.name.toLowerCase().includes(q));
  }, [widgetTab, sequences, macros, widgetSearch]);

  // =========================================================================
  // LUXURY DYNAMIC ISLAND & COMMAND CENTER SHORTCUT (WIDGET MODE x100)
  // =========================================================================
  if (isWidgetMode) {
    return (
      <div className="shortcut-root" style={{ alignItems: isSniperMode ? "center" : "flex-start", justifyContent: isSniperMode ? "center" : "flex-start" }}>
        {isSniperMode ? (
          <div className="sniper-pill-island">
            <div className="sniper-radar-dot" />
            <Target size={22} color="#2563eb" />
            {sniperCountdown > 0 ? (
              <span className="sniper-countdown-text">LOCKING IN {sniperCountdown}s...</span>
            ) : (
              <span className="sniper-click-text">CLICK TARGET NOW!</span>
            )}
          </div>
        ) : (
          <div className="shortcut-wrapper">

            {/* TOP TACTICAL DRAG HANDLE + MINIDYNAMIC ISLAND ORB */}
            <div className="shortcut-orb-dock">
              <div className="shortcut-drag-pill" data-tauri-drag-region title="Drag Shortcut Anywhere">
                <GripHorizontal size={13} data-tauri-drag-region />
              </div>

              <div
                onClick={() => setShowWidgetMenu(v => !v)}
                className={`shortcut-island-orb ${playbackStatus?.playing ? "is-playing" : ""} ${showWidgetMenu ? "is-active" : ""}`}
              >
                <div className="orb-glow-ring" />

                {playbackStatus?.playing ? (
                  <div className="orb-live-telemetry">
                    <div className="orb-live-top">
                      <span className={`orb-status-beacon ${playbackStatus.paused ? "paused" : "running"}`} />
                      <span className="orb-step-badge">
                        #{String(playbackStatus.currentStep).padStart(2, "0")}/{String(playbackStatus.totalSteps).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="orb-timer-readout">
                      {formatSeconds(playbackStatus.remainingSeconds)}
                    </div>
                    <div className="orb-mini-progress">
                      <div className="orb-mini-progress-bar" style={{ transform: `scaleX(${playbackStatus.progressPercent / 100})` }} />
                    </div>
                  </div>
                ) : (
                  <div className="orb-idle-core">
                    <Cpu size={26} color="#2563eb" className="orb-cpu-icon" />
                    <span className="orb-ready-dot" />
                  </div>
                )}
              </div>
            </div>

            {/* EXPANDED COMMAND CENTER MENU */}
            {showWidgetMenu && (
              <div className="shortcut-command-center">
                <div className="command-top-beam" />

                {/* HEADER */}
                <div className="command-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="command-logo-badge">
                      <Zap size={13} color="#ffffff" fill="currentColor" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>
                          Nexus <span style={{ color: "#2563eb" }}>Command</span>
                        </span>
                        <span className="command-online-tag">LIVE</span>
                      </div>
                      <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace", display: "block" }}>
                        Quick Launcher Dock
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button onClick={maximizeApp} className="command-window-btn" title="Expand Full Studio">
                      <Maximize2 size={13} />
                      <span>Studio</span>
                    </button>
                    <button onClick={() => setShowWidgetMenu(false)} className="command-icon-close" title="Collapse Menu">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* QUICK ACTION DOCK */}
                <div className="command-quick-grid">
                  <button onClick={() => handleWidgetStartRecording("sequence")} className="quick-dock-btn record-seq">
                    <span className="rec-dot-red" />
                    <span>Rec Flow</span>
                  </button>

                  <button onClick={() => handleWidgetStartRecording("macro")} className="quick-dock-btn record-macro">
                    <Layers size={12} color="#0284c7" />
                    <span>Rec Macro</span>
                  </button>
                </div>

                {/* ACTIVE PLAYBACK COCKPIT OR WORKFLOW LIST */}
                {playbackStatus?.playing ? (
                  <div className="command-live-cockpit">
                    <div className="cockpit-header">
                      <span className="cockpit-tag">
                        {playbackStatus.paused ? "PAUSED" : "EXECUTING NOW"}
                      </span>
                      <span className="cockpit-percent">{playbackStatus.progressPercent}%</span>
                    </div>

                    <h4 className="cockpit-title">{playbackStatus.templateName}</h4>

                    <div className="cockpit-metrics-grid">
                      <div className="cockpit-metric-box">
                        <span className="cockpit-label">CURRENT STEP</span>
                        <span className="cockpit-val blue">
                          {String(playbackStatus.currentStep).padStart(2, "0")} / {String(playbackStatus.totalSteps).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="cockpit-metric-box">
                        <span className="cockpit-label">ETA REMAINING</span>
                        <span className="cockpit-val amber">
                          {formatSeconds(playbackStatus.remainingSeconds)}
                        </span>
                      </div>
                    </div>

                    <div className="cockpit-step-desc">
                      <Activity size={12} color="#2563eb" style={{ flexShrink: 0 }} />
                      <span>{playbackStatus.stepDescription}</span>
                    </div>

                    <div className="cockpit-progress-track">
                      <div className="cockpit-progress-fill" style={{ transform: `scaleX(${playbackStatus.progressPercent / 100})` }} />
                    </div>

                    <div className="cockpit-controls">
                      {playbackStatus.paused ? (
                        <button onClick={handleResume} className="cockpit-btn resume">
                          <Play size={13} fill="currentColor" /> Resume Flow
                        </button>
                      ) : (
                        <button onClick={handlePause} className="cockpit-btn pause">
                          <Pause size={13} /> Pause Flow
                        </button>
                      )}
                      <button onClick={handleStop} className="cockpit-btn abort">
                        <Square size={13} fill="currentColor" /> Stop
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* SEARCH & SEGMENTED TABS */}
                    <div className="command-search-box">
                      <Search size={13} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Filter automations..."
                        value={widgetSearch}
                        onChange={(e) => setWidgetSearch(e.target.value)}
                      />
                      {widgetSearch && (
                        <button onClick={() => setWidgetSearch("")} className="clear-search-btn">
                          <X size={11} />
                        </button>
                      )}
                    </div>

                    <div className="command-tabs">
                      <button
                        onClick={() => setWidgetTab("sequences")}
                        className={`command-tab ${widgetTab === "sequences" ? "active-seq" : ""}`}
                      >
                        <PlayCircle size={12} />
                        <span>Workflows ({sequences.length})</span>
                      </button>
                      <button
                        onClick={() => setWidgetTab("macros")}
                        className={`command-tab ${widgetTab === "macros" ? "active-macro" : ""}`}
                      >
                        <Layers size={12} />
                        <span>Macros ({macros.length})</span>
                      </button>
                    </div>

                    {/* SCROLLABLE ITEMS LIST */}
                    <div className="command-list">
                      {filteredWidgetItems.map((t, i) => {
                        const isMac = t.name.startsWith("PROC_");
                        const dur = Math.round(t.steps?.reduce((acc, s) => acc + (s.delay || 0), 0) || 0);
                        return (
                          <div
                            key={t.id ?? t.name}
                            onClick={() => handlePlayTemplate(t.name)}
                            className={`command-list-item ${isMac ? "macro-item" : "seq-item"}`}
                            style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "9px", overflow: "hidden" }}>
                              <div className={`item-play-badge ${isMac ? "macro" : "seq"}`}>
                                <Play size={11} fill="currentColor" />
                              </div>
                              <div style={{ overflow: "hidden" }}>
                                <div className="item-title">{t.name}</div>
                                <div className="item-meta">
                                  <span>{t.steps?.length || 0} steps</span>
                                  <span>•</span>
                                  <span>~{dur}s</span>
                                </div>
                              </div>
                            </div>

                            <span className="item-run-pill">RUN</span>
                          </div>
                        );
                      })}
                      {filteredWidgetItems.length === 0 && (
                        <div className="command-empty">No matching automations</div>
                      )}
                    </div>
                  </>
                )}

                {/* FOOTER SIGNATURE */}
                <div className="command-footer">
                  <Code2 size={11} color="#2563eb" />
                  <span>crafted by <strong>ouail.elabdi</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const showLibrary = recordedSteps.length === 0 && !isRecording;
  const showEditor = recordedSteps.length > 0 && !isRecording;
  const allSelected = sequences.length > 0 && selectedTemplateNames.length === sequences.length;

  // =========================================================================
  // MAIN STUDIO FULL WINDOW
  // =========================================================================
  return (
    <div className="app-container">
      <MemoBackground isBusy={isPlaying} />

      {/* CLEAN VERCEL-STYLE TITLEBAR WITH SIGNATURE */}
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-brand" data-tauri-drag-region>
          <span className={`titlebar-led ${isPlaying ? "is-live" : ""}`} />
          <span style={{ color: "#0f172a", fontWeight: 700 }}>Nexus RPA</span>
          <span style={{ color: "#cbd5e1" }}>/</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", color: "#64748b" }}>ouail.elabdi</span>
        </div>
        <div>
          <button className="titlebar-btn" onClick={minimizeToWidget} title="Switch to Floating Shortcut Island"><Minus size={15} /></button>
          <button className="titlebar-btn titlebar-close" onClick={closeApp} title="Close"><X size={15} /></button>
        </div>
      </div>

      <div className="container">
        <RecordingOverlay countdown={countdown} isRecording={isRecording} onStop={handleStopRecording} />

        <PlaybackOverlay
          status={playbackStatus}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />

        {batchTemplateTarget && (
          <BatchModal templateName={batchTemplateTarget} onClose={() => setBatchTemplateTarget(null)} onStartBatch={handleStartBatch} />
        )}

        {/* MODAL CONFIGURATION PIPELINE MERGE */}
        {showMergeModal && (
          <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowMergeModal(false); }}>
            <div className="modal-content">
              <div className="modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="modal-icon-chip"><Globe size={18} color="#2563eb" /></div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Configure Pipeline URLs</h3>
                </div>
                <button onClick={() => setShowMergeModal(false)} className="titlebar-btn"><X size={18} /></button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: "0.84rem", color: "#64748b", marginBottom: "4px" }}>
                  Specify the target URL to open in Citrix Incognito Browser before executing each indicator:
                </p>

                <div className="pipeline-url-list">
                  {selectedTemplateNames.map((name, idx) => (
                    <div key={name} className="pipeline-url-row" style={{ "--i": idx } as React.CSSProperties}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span className="pipeline-url-index">{idx + 1}</span>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{name}</span>
                      </div>
                      <input
                        type="text"
                        className="luxe-input mono"
                        value={templateUrls[name] || ""}
                        onChange={(e) => setTemplateUrls(prev => ({ ...prev, [name]: e.target.value }))}
                        placeholder="e.g., https://citrix.corp/satcli_export"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <Button variant="ghost" onClick={() => setShowMergeModal(false)}>Cancel</Button>
                <Button variant="primary" onClick={handleConfirmMerge}>
                  <ArrowRight size={15} /> Generate Merged Pipeline
                </Button>
              </div>
            </div>
          </div>
        )}

        <HeroSection
          isRecording={isRecording}
          hasRecordedSteps={recordedSteps.length > 0}
          onStartSequence={() => handleStartRecording("sequence")}
          onStartMacro={() => handleStartRecording("macro")}
        />

        {showLibrary && (
          <div className="library-view">
            {/* SEGMENTED TABS — sliding GPU pill */}
            <div className="library-toolbar">
              <div className="nx-segmented" role="tablist">
                {(["sequences", "macros"] as const).map((tab) => {
                  const active = activeTab === tab;
                  const isSeq = tab === "sequences";
                  return (
                    <button
                      key={tab}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab)}
                      className={`nx-segmented-btn ${active ? "is-active" : ""} ${isSeq ? "" : "is-macro"}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="nx-tab-pill"
                          className="nx-segmented-pill"
                          transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.7 }}
                        />
                      )}
                      <span className="nx-segmented-label">
                        {isSeq ? <PlayCircle size={15} /> : <Layers size={15} />}
                        <span>{isSeq ? "Workflows" : "Sub-Routines"}</span>
                        <span className="nx-segmented-count">{isSeq ? sequences.length : macros.length}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeTab === "sequences" && sequences.length > 0 && (
                <button onClick={selectAllSequences} className="nx-ghost-chip">
                  {allSelected ? <CheckSquare size={15} color="#2563eb" /> : <SquareIcon size={15} color="#94a3b8" />}
                  {allSelected ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {/* 3-COLUMN GRID — keyed by tab so cards re-stagger on switch */}
            {activeTab === "sequences" && (
              <div className="grid-container" key="grid-seq">
                {sequences.map((template, i) => (
                  <TemplateCard
                    key={template.id ?? template.name}
                    index={i}
                    template={template}
                    isSelected={selectedSet.has(template.name)}
                    onToggleSelect={toggleSelectTemplate}
                    onPlay={handlePlayTemplate}
                    onEdit={handleEditTemplate}
                    onBatchPlay={setBatchTemplateTarget}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
                {sequences.length === 0 && <p className="library-empty">No workflows found.</p>}
              </div>
            )}

            {activeTab === "macros" && (
              <div className="grid-container" key="grid-macro">
                {macros.map((template, i) => (
                  <TemplateCard
                    key={template.id ?? template.name}
                    index={i}
                    template={template}
                    onPlay={handlePlayTemplate}
                    onEdit={handleEditTemplate}
                    onBatchPlay={setBatchTemplateTarget}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
                {macros.length === 0 && <p className="library-empty">No sub-routines found.</p>}
              </div>
            )}
          </div>
        )}

        {/* FLOATING PIPELINE MERGE BAR */}
        <AnimatePresence>
          {selectedTemplateNames.length > 0 && recordedSteps.length === 0 && (
            <motion.div
              key="merge-bar"
              className="nx-merge-bar"
              initial={{ opacity: 0, y: 24, scale: 0.96, x: "-50%" }}
              animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
              exit={{ opacity: 0, y: 16, scale: 0.97, x: "-50%" }}
              transition={{ type: "spring", stiffness: 480, damping: 34 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <motion.div
                  key={selectedTemplateNames.length}
                  className="nx-merge-count"
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 700, damping: 18 }}
                >
                  {selectedTemplateNames.length}
                </motion.div>
                <span style={{ fontSize: "0.86rem", color: "#0f172a", fontWeight: 700 }}>
                  Workflows Selected
                </span>
              </div>

              <div style={{ height: "20px", width: "1px", background: "#e2e8f0" }} />

              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTemplateNames([])}>
                  Clear
                </Button>
                <Button variant="primary" size="sm" onClick={handleOpenMergeModal}>
                  <Combine size={15} /> Merge & Configure Pipeline
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showEditor && (
          <div className="editor-view">
            <EditorHeader templateName={templateName} setTemplateName={setTemplateName} recordingType={recordingType} onSave={handleSaveTemplate} onDiscard={() => setRecordedSteps([])} />
            <StepEditor
              steps={recordedSteps}
              templates={templates}
              onUpdateStep={handleUpdateStep}
              onAddAction={handleAddAction}
              onRemoveStep={handleRemoveStep}
              onDuplicateStep={handleDuplicateStep}
              onMoveStepToPosition={handleMoveStepToPosition}
              onSniperMode={handleSniperMode}
              onMoveStep={handleMoveStep}
            />
          </div>
        )}

        {/* SIGNATURE BADGE OUAIL.ELABDI */}
        <div className="signature-badge">
          <Code2 size={13} color="#2563eb" />
          <span>architected by <strong style={{ color: "#0f172a", fontFamily: "'JetBrains Mono', monospace" }}>ouail.elabdi</strong></span>
        </div>
      </div>
    </div>
  );
}
