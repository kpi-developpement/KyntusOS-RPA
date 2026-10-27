"use client";

import { useState, useEffect } from "react";
import { rpaApi } from "../services/api";
import { Template, Step, PlaybackStatus } from "../types";
import { 
  Minus, X, Maximize2, Play, Pause, Square, Cpu, GripHorizontal, 
  Target, Layers, PlayCircle, Combine, CheckSquare, Square as SquareIcon, 
  Globe, ArrowRight, Code2, Search, Eraser, Sparkles, Clock, Activity, Zap
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

  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);

  // WIDGET / SHORTCUT STATES
  const [isWidgetMode, setIsWidgetMode] = useState(false);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [widgetTab, setWidgetTab] = useState<"sequences" | "macros">("sequences");
  const [widgetSearch, setWidgetSearch] = useState("");

  const [isSniperMode, setIsSniperMode] = useState(false);
  const [sniperCountdown, setSniperCountdown] = useState(0);

  const [batchTemplateTarget, setBatchTemplateTarget] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"sequences" | "macros">("sequences");

  useEffect(() => { loadTemplates(); }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await rpaApi.getPlaybackStatus();
        setPlaybackStatus(status);
      } catch (e) {}
    }, 450);

    return () => clearInterval(interval);
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await rpaApi.getTemplates();
      setTemplates(data);
    } catch (error) { console.error(error); }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this automation?")) {
      try {
        await rpaApi.deleteTemplate(id);
        loadTemplates(); 
      } catch (error) {
        console.error("Failed to delete template:", error);
      }
    }
  };

  const toggleSelectTemplate = (name: string) => {
    if (selectedTemplateNames.includes(name)) {
      setSelectedTemplateNames(selectedTemplateNames.filter(n => n !== name));
    } else {
      setSelectedTemplateNames([...selectedTemplateNames, name]);
    }
  };

  const selectAllSequences = () => {
    const seqNames = sequences.map(s => s.name);
    if (selectedTemplateNames.length === seqNames.length) {
      setSelectedTemplateNames([]);
    } else {
      setSelectedTemplateNames(seqNames);
    }
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
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "CTRL_SHIFT_N",
          delay: 2.0
        });
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "CTRL_L",
          delay: 1.0
        });
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "TYPE_TEXT",
          parameter: targetUrl,
          delay: 1.0
        });
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "ENTER",
          delay: 4.0
        });
      }

      t.steps.forEach(step => {
        mergedSteps.push({
          ...step,
          orderIndex: currentOrder++
        });
      });

      if (tIdx < selectedTemplateNames.length - 1) {
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "ALT_F4",
          delay: 1.5
        });
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "TYPE_N",
          delay: 1.0
        });
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "CTRL_W",
          delay: 1.0
        });
        mergedSteps.push({
          orderIndex: currentOrder++,
          type: "ACTION",
          actionName: "ALT_TAB",
          delay: 1.5
        });
      }
    });

    setTemplateName("PIPELINE_" + selectedTemplateNames.map(n => n.substring(0, 6)).join("_"));
    setRecordingType("sequence");
    setRecordedSteps(mergedSteps);
    setShowMergeModal(false);
    setSelectedTemplateNames([]);
  };

  // DYNAMIC TAURI WINDOW RESIZE FOR SHORTCUT MODE
  useEffect(() => {
    if (!isWidgetMode) return;
    const resizeWidget = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const { LogicalSize } = await import('@tauri-apps/api/dpi');
        const appWindow = getCurrentWindow();
        
        if (isSniperMode) {
          await appWindow.setSize(new LogicalSize(280, 95));
          await appWindow.center();
        } else if (showWidgetMenu) {
          await appWindow.setSize(new LogicalSize(360, 580));
        } else if (playbackStatus?.playing) {
          await appWindow.setSize(new LogicalSize(210, 115));
        } else {
          await appWindow.setSize(new LogicalSize(110, 115));
        }
      } catch (e) {}
    };
    resizeWidget();
  }, [showWidgetMenu, isWidgetMode, isSniperMode, playbackStatus?.playing]);

  const minimizeToWidget = async () => {
    setIsWidgetMode(true); 
    setShowWidgetMenu(false);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize, LogicalPosition } = await import('@tauri-apps/api/dpi');
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(110, 115));
      await appWindow.setPosition(new LogicalPosition(40, 40));
      await appWindow.setAlwaysOnTop(true);
    } catch (e) {}
  };

  const maximizeApp = async () => {
    setIsWidgetMode(false); 
    setShowWidgetMenu(false); 
    setIsSniperMode(false);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const { LogicalSize } = await import('@tauri-apps/api/dpi');
      const appWindow = getCurrentWindow();
      await appWindow.setSize(new LogicalSize(1280, 840));
      await appWindow.setAlwaysOnTop(false);
      setTimeout(async () => { await appWindow.center(); await appWindow.setFocus(); }, 100);
    } catch (e) {}
  };

  const closeApp = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {}
  };

  const handleSniperMode = async (stepIndex: number) => {
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
          const newSteps = [...recordedSteps];
          newSteps[stepIndex].xCoordinate = coords.x;
          newSteps[stepIndex].yCoordinate = coords.y;
          setRecordedSteps(newSteps);
        } catch (error) {
          console.error("Sniper capture failed", error);
        } finally {
          await maximizeApp();
        }
      }
    }, 1000);
  };

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

  const handleEditTemplate = (template: Template) => {
    setTemplateName(template.name);
    setRecordingType(template.name.startsWith("PROC_") ? "macro" : "sequence");
    const safeSteps = template.steps || [];
    setRecordedSteps(safeSteps.map(step => ({ ...step })));
  };

  const handlePlayTemplate = async (name: string) => {
    try { 
      await rpaApi.playTemplate(name); 
    } catch (error) {
      console.error("Playback failed to start", error);
    }
  };

  const handleStartBatch = async (filePaths: string[]) => {
    if (!batchTemplateTarget) return;
    try {
      setBatchTemplateTarget(null); 
      await rpaApi.playBatchTemplate(batchTemplateTarget, filePaths);
    } catch (error) {
      console.error("Batch playback failed", error);
    }
  };

  const handlePause = async () => { await rpaApi.pausePlayback(); };
  const handleResume = async () => { await rpaApi.resumePlayback(); };
  const handleStop = async () => { await rpaApi.stopPlayback(); };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...recordedSteps];
    if (direction === "up" && index > 0) {
      const temp = newSteps[index];
      newSteps[index] = newSteps[index - 1];
      newSteps[index - 1] = temp;
    } else if (direction === "down" && index < newSteps.length - 1) {
      const temp = newSteps[index];
      newSteps[index] = newSteps[index + 1];
      newSteps[index + 1] = temp;
    }
    newSteps.forEach((step, i) => (step.orderIndex = i));
    setRecordedSteps(newSteps);
  };

  const handleDuplicateStep = (index: number) => {
    const stepToCopy = recordedSteps[index];
    const duplicatedStep: Step = {
      ...stepToCopy,
      orderIndex: index + 1
    };

    const newSteps = [...recordedSteps];
    newSteps.splice(index + 1, 0, duplicatedStep);
    newSteps.forEach((step, i) => (step.orderIndex = i));
    setRecordedSteps(newSteps);
  };

  const handleMoveStepToPosition = (fromIndex: number, targetPosition: number) => {
    const toIndex = targetPosition - 1;
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= recordedSteps.length) return;

    const newSteps = [...recordedSteps];
    const [movedStep] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, movedStep);

    newSteps.forEach((step, i) => (step.orderIndex = i));
    setRecordedSteps(newSteps);
  };

  const handleAddAction = (type: "CLICK" | "ACTION", atIndex?: number) => {
    const newStep: Step = type === "CLICK" 
      ? { orderIndex: 0, type: "CLICK", delay: 2.0, xCoordinate: 0, yCoordinate: 0 }
      : { orderIndex: 0, type: "ACTION", actionName: "CTRL_A", delay: 2.0 };

    const newSteps = [...recordedSteps];
    if (atIndex !== undefined && atIndex >= 0 && atIndex <= newSteps.length) {
      newSteps.splice(atIndex, 0, newStep);
    } else {
      newSteps.push(newStep);
    }
    newSteps.forEach((step, i) => (step.orderIndex = i));
    setRecordedSteps(newSteps);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const sequences = templates.filter(t => !t.name.startsWith("PROC_"));
  const macros = templates.filter(t => t.name.startsWith("PROC_"));

  const filteredWidgetItems = (widgetTab === "sequences" ? sequences : macros).filter(t =>
    t.name.toLowerCase().includes(widgetSearch.toLowerCase())
  );

  // =========================================================================
  // LUXURY DYNAMIC ISLAND & COMMAND CENTER SHORTCUT (WIDGET MODE x100)
  // =========================================================================
  if (isWidgetMode) {
    return (
      <div className="shortcut-root" style={{ alignItems: isSniperMode ? 'center' : 'flex-start', justifyContent: isSniperMode ? 'center' : 'flex-start' }}>
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
                onClick={() => setShowWidgetMenu(!showWidgetMenu)}
                className={`shortcut-island-orb ${playbackStatus?.playing ? "is-playing" : ""} ${showWidgetMenu ? "is-active" : ""}`}
              >
                <div className="orb-glow-ring" />
                
                {playbackStatus?.playing ? (
                  <div className="orb-live-telemetry">
                    <div className="orb-live-top">
                      <span className={`orb-status-beacon ${playbackStatus.paused ? "paused" : "running"}`} />
                      <span className="orb-step-badge">
                        #{String(playbackStatus.currentStep).padStart(2, '0')}/{String(playbackStatus.totalSteps).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="orb-timer-readout">
                      {formatSeconds(playbackStatus.remainingSeconds)}
                    </div>
                    <div className="orb-mini-progress">
                      <div className="orb-mini-progress-bar" style={{ width: `${playbackStatus.progressPercent}%` }} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="command-logo-badge">
                      <Zap size={13} color="#ffffff" fill="currentColor" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                          Nexus <span style={{ color: '#2563eb' }}>Command</span>
                        </span>
                        <span className="command-online-tag">LIVE</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontFamily: "'Fira Code', monospace", display: 'block' }}>
                        Quick Launcher Dock
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      onClick={maximizeApp} 
                      className="command-window-btn" 
                      title="Expand Full Studio"
                    >
                      <Maximize2 size={13} />
                      <span>Studio</span>
                    </button>
                    <button 
                      onClick={() => setShowWidgetMenu(false)} 
                      className="command-icon-close" 
                      title="Collapse Menu"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* QUICK ACTION DOCK (3 TACTICAL SHORTCUTS) */}
                <div className="command-quick-grid">
                  <button 
                    onClick={() => handleWidgetStartRecording("sequence")} 
                    className="quick-dock-btn record-seq"
                  >
                    <span className="rec-dot-red" />
                    <span>Rec Flow</span>
                  </button>

                  <button 
                    onClick={() => handleWidgetStartRecording("macro")} 
                    className="quick-dock-btn record-macro"
                  >
                    <Layers size={12} color="#059669" />
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
                          {String(playbackStatus.currentStep).padStart(2, '0')} / {String(playbackStatus.totalSteps).padStart(2, '0')}
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
                      <div className="cockpit-progress-fill" style={{ width: `${playbackStatus.progressPercent}%` }} />
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
                      {filteredWidgetItems.map(t => {
                        const isMac = t.name.startsWith("PROC_");
                        const dur = Math.round(t.steps?.reduce((acc, s) => acc + (s.delay || 0), 0) || 0);
                        return (
                          <div 
                            key={t.id} 
                            onClick={() => handlePlayTemplate(t.name)}
                            className={`command-list-item ${isMac ? "macro-item" : "seq-item"}`}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden' }}>
                              <div className={`item-play-badge ${isMac ? "macro" : "seq"}`}>
                                <Play size={11} fill="currentColor" />
                              </div>
                              <div style={{ overflow: 'hidden' }}>
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

  // =========================================================================
  // MAIN STUDIO FULL WINDOW
  // =========================================================================
  return (
    <div className="app-container">
      <InteractiveBackground />
      
      {/* CLEAN VERCEL-STYLE TITLEBAR WITH SIGNATURE */}
      <div className="titlebar" data-tauri-drag-region>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }} data-tauri-drag-region>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
          <span style={{ color: '#0f172a', fontWeight: 700 }}>Nexus RPA</span>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: '0.7rem', color: '#64748b' }}>ouail.elabdi</span>
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
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={20} color="#2563eb" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Configure Pipeline URLs</h3>
                </div>
                <button onClick={() => setShowMergeModal(false)} className="titlebar-btn"><X size={18} /></button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '18px' }}>
                  Specify the target URL to open in Citrix Incognito Browser before executing each indicator:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTemplateNames.map((name, idx) => (
                    <div key={name} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ background: '#2563eb', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{name}</span>
                      </div>
                      <input 
                        type="text" 
                        value={templateUrls[name] || ""} 
                        onChange={(e) => setTemplateUrls({ ...templateUrls, [name]: e.target.value })}
                        placeholder="e.g., https://citrix.corp/satcli_export"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontFamily: "'Fira Code', monospace", fontSize: '0.82rem', color: '#0f172a', outline: 'none' }}
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

        {recordedSteps.length === 0 && !isRecording && (
          <div>
            {/* SEGMENTED TABS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '26px' }}>
              <div style={{ 
                display: 'inline-flex', 
                background: 'rgba(226, 232, 240, 0.65)', 
                backdropFilter: 'blur(8px)',
                padding: '4px', 
                borderRadius: '14px',
                border: '1px solid rgba(203, 213, 225, 0.6)'
              }}>
                <button 
                  onClick={() => setActiveTab("sequences")}
                  style={{ 
                    background: activeTab === "sequences" ? '#ffffff' : 'transparent', 
                    border: 'none', 
                    padding: '8px 18px', 
                    borderRadius: '10px',
                    fontSize: '0.86rem', 
                    fontWeight: 700, 
                    color: activeTab === "sequences" ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === "sequences" ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PlayCircle size={15} color={activeTab === "sequences" ? "#2563eb" : "#64748b"} />
                  <span>Workflows</span>
                  <span style={{ background: activeTab === "sequences" ? '#eff6ff' : 'rgba(148,163,184,0.2)', color: activeTab === "sequences" ? '#2563eb' : '#64748b', padding: '1px 7px', borderRadius: '99px', fontSize: '0.72rem' }}>
                    {sequences.length}
                  </span>
                </button>
                <button 
                  onClick={() => setActiveTab("macros")}
                  style={{ 
                    background: activeTab === "macros" ? '#ffffff' : 'transparent', 
                    border: 'none', 
                    padding: '8px 18px', 
                    borderRadius: '10px',
                    fontSize: '0.86rem', 
                    fontWeight: 700, 
                    color: activeTab === "macros" ? '#0f172a' : '#64748b',
                    boxShadow: activeTab === "macros" ? '0 2px 8px rgba(15, 23, 42, 0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={15} color={activeTab === "macros" ? "#10b981" : "#64748b"} />
                  <span>Sub-Routines</span>
                  <span style={{ background: activeTab === "macros" ? '#ecfdf5' : 'rgba(148,163,184,0.2)', color: activeTab === "macros" ? '#059669' : '#64748b', padding: '1px 7px', borderRadius: '99px', fontSize: '0.72rem' }}>
                    {macros.length}
                  </span>
                </button>
              </div>

              {activeTab === "sequences" && sequences.length > 0 && (
                <button 
                  onClick={selectAllSequences}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.85)', 
                    border: '1px solid #e2e8f0', 
                    padding: '8px 14px',
                    borderRadius: '11px',
                    color: '#475569', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '7px', 
                    fontSize: '0.8rem', 
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  {selectedTemplateNames.length === sequences.length ? <CheckSquare size={15} color="#2563eb" /> : <SquareIcon size={15} color="#94a3b8" />}
                  {selectedTemplateNames.length === sequences.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {/* 3-COLUMN GRID */}
            {activeTab === "sequences" && (
              <div className="grid-container">
                {sequences.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    isSelected={selectedTemplateNames.includes(template.name)}
                    onToggleSelect={toggleSelectTemplate}
                    onPlay={handlePlayTemplate} 
                    onEdit={handleEditTemplate} 
                    onBatchPlay={(name) => setBatchTemplateTarget(name)} 
                    onDelete={handleDeleteTemplate} 
                  />
                ))}
                {sequences.length === 0 && <p style={{ color: '#64748b' }}>No workflows found.</p>}
              </div>
            )}

            {activeTab === "macros" && (
              <div className="grid-container">
                {macros.map((template) => (
                  <TemplateCard key={template.id} template={template} onPlay={handlePlayTemplate} onEdit={handleEditTemplate} onBatchPlay={(name) => setBatchTemplateTarget(name)} onDelete={handleDeleteTemplate} />
                ))}
                {macros.length === 0 && <p style={{ color: '#64748b' }}>No sub-routines found.</p>}
              </div>
            )}
          </div>
        )}

        {/* FLOATING PIPELINE MERGE BAR */}
        {selectedTemplateNames.length > 0 && recordedSteps.length === 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(147, 197, 253, 0.8)',
              borderRadius: '999px',
              padding: '10px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              boxShadow: '0 20px 50px -10px rgba(37, 99, 235, 0.22), 0 0 0 1px rgba(59, 130, 246, 0.1)',
              zIndex: 900
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                {selectedTemplateNames.length}
              </div>
              <span style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 700 }}>
                Workflows Selected
              </span>
            </div>

            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTemplateNames([])}>
                Clear
              </Button>
              <Button variant="primary" size="sm" onClick={handleOpenMergeModal}>
                <Combine size={15} /> Merge & Configure Pipeline
              </Button>
            </div>
          </div>
        )}

        {recordedSteps.length > 0 && !isRecording && (
          <div>
            <EditorHeader templateName={templateName} setTemplateName={setTemplateName} recordingType={recordingType} onSave={handleSaveTemplate} onDiscard={() => setRecordedSteps([])} />
            <StepEditor
              steps={recordedSteps} 
              templates={templates}
              onUpdateStep={(index, field, value) => {
                const newSteps = [...recordedSteps]; newSteps[index] = { ...newSteps[index], [field]: value }; setRecordedSteps(newSteps);
              }}
              onAddAction={handleAddAction}
              onRemoveStep={(index) => {
                const newSteps = recordedSteps.filter((_, i) => i !== index); 
                newSteps.forEach((step, i) => (step.orderIndex = i)); 
                setRecordedSteps(newSteps);
              }}
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
          <span>architected by <strong style={{ color: '#0f172a', fontFamily: "'Fira Code', monospace" }}>ouail.elabdi</strong></span>
        </div>
      </div>
    </div>
  );
}