"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  MousePointer2, Zap, Trash2, Layers, FolderOpen, Target,
  ChevronUp, ChevronDown, Clock, Plus, CopyPlus
} from "lucide-react";
import { Step, Template } from "../../types";
import ModernSelect, { OptionGroup } from "../ui/ModernSelect";

interface StepEditorProps {
  steps: Step[];
  templates: Template[];
  onUpdateStep: (index: number, field: keyof Step, value: any) => void;
  onAddAction: (type: "CLICK" | "ACTION", atIndex?: number) => void;
  onRemoveStep: (index: number) => void;
  onDuplicateStep: (index: number) => void;
  onMoveStepToPosition: (fromIndex: number, toPosition: number) => void;
  onSniperMode: (index: number) => void;
  onMoveStep: (index: number, direction: "up" | "down") => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in action catalogue — hoisted to module scope (built ONCE, not every
// render of every row like before).
// ─────────────────────────────────────────────────────────────────────────────
const BUILTIN_GROUPS: OptionGroup[] = [
  {
    groupLabel: "Window & Screen Controls (Priority)",
    options: [
      { value: "MAXIMIZE_WINDOW", label: "Instant Maximize: Alt + Space + N (Agrandir 1-Click)", type: "builtin" },
      { value: "ALT_F4", label: "Force Close Active Window (Alt + F4)", type: "builtin" },
      { value: "FOCUS_WINDOW", label: "OS: Bring Window to Front (Citrix / Chrome / Excel)", type: "builtin" },
      { value: "CTRL_SHIFT_N", label: "Open Incognito Window (Ctrl + Shift + N)", type: "builtin" },
      { value: "ALT_TAB", label: "Switch Active Window (Alt + Tab)", type: "builtin" },
      { value: "CTRL_W", label: "Close Current Browser Tab (Ctrl + W)", type: "builtin" },
      { value: "CTRL_SHIFT_W", label: "Close Entire Browser Window (Ctrl + Shift + W)", type: "builtin" },
      { value: "WIN_UP", label: "Windows Snap Maximize (Win + Up)", type: "builtin" },
      { value: "WIN_D", label: "Show Desktop / Minimize All (Win + D)", type: "builtin" },
      { value: "HANDLE_EXCEL_CLIPBOARD_PROMPT", label: "Excel: Auto Confirm Large Clipboard ('Oui')", type: "builtin" },
    ]
  },
  {
    groupLabel: "Power RPA & Excel / Citrix Shortcuts (+12 Pro Options)",
    options: [
      { value: "CTRL_S", label: "Save File / Document (Ctrl + S)", type: "builtin" },
      { value: "F5_REFRESH", label: "Refresh Page / Citrix View (F5)", type: "builtin" },
      { value: "CTRL_R", label: "Hard Reload Browser Page (Ctrl + R)", type: "builtin" },
      { value: "CTRL_F", label: "Find / Search in Page or Sheet (Ctrl + F)", type: "builtin" },
      { value: "CTRL_T", label: "Open New Browser Tab (Ctrl + T)", type: "builtin" },
      { value: "CTRL_SHIFT_T", label: "Reopen Last Closed Tab (Ctrl + Shift + T)", type: "builtin" },
      { value: "CTRL_J", label: "Open Browser Downloads Panel (Ctrl + J)", type: "builtin" },
      { value: "BACKSPACE", label: "Press Backspace (Clear Input Field)", type: "basic" },
      { value: "DELETE_KEY", label: "Press Delete (Suppr / Clear Selected Cells)", type: "basic" },
      { value: "SHIFT_TAB", label: "Reverse Tab Navigation (Shift + Tab)", type: "basic" },
      { value: "ARROW_DOWN", label: "Press Down Arrow (Next Row / Dropdown)", type: "basic" },
      { value: "ARROW_UP", label: "Press Up Arrow (Previous Row)", type: "basic" },
      { value: "PAGE_DOWN", label: "Scroll Page Down (PgDn)", type: "basic" },
      { value: "PAGE_UP", label: "Scroll Page Up (PgUp)", type: "basic" },
      { value: "RIGHT_CLICK", label: "Mouse Right Click (Context Menu)", type: "basic" },
    ]
  },
  {
    groupLabel: "Mother Context & Data Transfer",
    options: [
      { value: "SET_MOTHER_DESTINATION", label: "Set Mother Target Destination (Folder & Name)", type: "builtin" },
      { value: "SAVE_CLIPBOARD_TO_MOTHER_DESTINATION", label: "Save Clipboard to Mother Destination", type: "builtin" },
      { value: "TYPE_MOTHER_DESTINATION_FILE", label: "Type Mother File Path (File Open Dialog)", type: "builtin" },
      { value: "COPY_MOTHER_DESTINATION_TO_CLIPBOARD", label: "Copy Mother File Path to Clipboard", type: "builtin" },
      { value: "CLEAR_CLIPBOARD", label: "Clear & Verify Empty Clipboard", type: "builtin" },
      { value: "SAVE_CLIPBOARD_TO_CSV", label: "Save Clipboard to Custom Path", type: "builtin" },
      { value: "DETECT_LATEST_DOWNLOADED_FILE", label: "Detect Latest Downloaded File", type: "builtin" },
    ]
  },
  {
    groupLabel: "System Procedures",
    options: [
      { value: "OPEN_CHROME", label: "SYS: Open Google Chrome / OS Command", type: "builtin" },
      { value: "BROWSE_AND_INJECT_FILES", label: "SYS: Browse Folder & Loop", type: "builtin" },
    ]
  },
  {
    groupLabel: "Core Keyboard & Clipboard Actions",
    options: [
      { value: "TAB", label: "Press Tab", type: "basic" }, 
      { value: "ENTER", label: "Press Enter", type: "basic" },
      { value: "CTRL_C", label: "Copy (Ctrl + C - Clears & Verifies)", type: "basic" },
      { value: "CTRL_V", label: "Paste (Ctrl + V)", type: "basic" },
      { value: "CTRL_A", label: "Select All (Ctrl + A)", type: "basic" },
      { value: "TYPE_TEXT", label: "Type Custom Text (Paste)", type: "basic" },
      { value: "TYPE_LAST_SAVED_FILE", label: "Type Last Saved File Path (Memory)", type: "basic" }, 
      { value: "TYPE_CURRENT_FILE", label: "Type Current File Path (Batch Loop)", type: "basic" },
      { value: "CTRL_L", label: "Focus Address Bar (Ctrl + L)", type: "basic" },
      { value: "CTRL_HOME", label: "Go to Top of Sheet (Ctrl + Home)", type: "basic" },
      { value: "ESC", label: "Press Escape (Esc)", type: "basic" },
      { value: "TYPE_N", label: "Press 'N' (Don't Save / Agrandir)", type: "basic" },
      { value: "DOUBLE_CLICK", label: "Double Click", type: "basic" },
    ]
  },
];

const parseJson = <T extends object>(raw: string | undefined, fallback: T, plainKey: keyof T): T => {
  if (!raw) return fallback;
  try {
    if (raw.startsWith("{")) return { ...fallback, ...JSON.parse(raw) };
    return { ...fallback, [plainKey]: raw };
  } catch {
    return fallback;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// One timeline row — memoized: editing step #7 re-renders only row #7.
// ─────────────────────────────────────────────────────────────────────────────
interface StepRowProps {
  step: Step;
  index: number;
  isLast: boolean;
  isDropdownOpen: boolean;
  optionGroups: OptionGroup[];
  totalSteps: number;
  onUpdateStep: StepEditorProps["onUpdateStep"];
  onAddAction: StepEditorProps["onAddAction"];
  onRemoveStep: StepEditorProps["onRemoveStep"];
  onDuplicateStep: StepEditorProps["onDuplicateStep"];
  onMoveStepToPosition: StepEditorProps["onMoveStepToPosition"];
  onSniperMode: StepEditorProps["onSniperMode"];
  onMoveStep: StepEditorProps["onMoveStep"];
  onDropdownChange: (index: number, open: boolean) => void;
}

const StepRow = memo(function StepRow({
  step,
  index,
  isLast,
  isDropdownOpen,
  optionGroups,
  totalSteps,
  onUpdateStep,
  onAddAction,
  onRemoveStep,
  onDuplicateStep,
  onMoveStepToPosition,
  onSniperMode,
  onMoveStep,
  onDropdownChange,
}: StepRowProps) {
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [targetPositionInput, setTargetPositionInput] = useState("");

  const isAction = step.type === "ACTION";
  const isCustomProc = isAction && !!step.actionName?.startsWith("CUSTOM_PROC_");
  const isTypeText = isAction && step.actionName === "TYPE_TEXT";
  const isSaveLocal = isAction && step.actionName === "SAVE_CLIPBOARD_TO_CSV";
  const isCmdExecute = isAction && step.actionName === "OPEN_CHROME";
  const isSetMotherDest = isAction && step.actionName === "SET_MOTHER_DESTINATION";
  const isFocusWin = isAction && step.actionName === "FOCUS_WINDOW";

  const saveData = isSaveLocal ? parseJson(step.parameter, { folder: "", filename: "" }, "filename") : null;
  const motherConfig = isSetMotherDest
    ? parseJson(step.parameter, { folder: "C:\\Nexus_Data", filename: "Project_Data.csv" }, "folder")
    : null;

  const handleBrowseFolderForParam = async (currentParam: string, defaultName: string) => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selectedFolder = await open({ directory: true, multiple: false });
      if (selectedFolder && typeof selectedFolder === "string") {
        let data = { folder: selectedFolder, filename: defaultName };
        try {
          if (currentParam && currentParam.startsWith("{")) {
            data = { ...JSON.parse(currentParam), folder: selectedFolder };
          }
        } catch (e) {}
        onUpdateStep(index, "parameter", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to pick folder:", error);
    }
  };

  const commitTeleport = () => {
    const targetPos = parseInt(targetPositionInput, 10);
    if (!isNaN(targetPos) && targetPos >= 1 && targetPos <= totalSteps) {
      onMoveStepToPosition(index, targetPos);
    }
    setIsTeleporting(false);
    setTargetPositionInput("");
  };

  const handleOpenChange = useCallback((open: boolean) => onDropdownChange(index, open), [onDropdownChange, index]);
  const handleActionChange = useCallback((val: string) => onUpdateStep(index, "actionName", val), [onUpdateStep, index]);

  const rowType = step.type === "CLICK" ? "type-click" : isCustomProc ? "type-macro" : "type-action";

  return (
    <div
      className={`step-item-group ${isDropdownOpen ? "is-elevated" : ""}`}
      style={{ "--i": Math.min(index, 14) } as React.CSSProperties}
    >
      <div className={`step-luxe-row ${rowType}`}>
        <span className="step-node-dot" aria-hidden="true" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          {/* LEFT: TELEPORT BADGE & TYPE */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {isTeleporting ? (
              <div className="step-teleport-box">
                <span>Move to</span>
                <input
                  type="number"
                  autoFocus
                  value={targetPositionInput}
                  onChange={(e) => setTargetPositionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTeleport();
                    if (e.key === "Escape") setIsTeleporting(false);
                  }}
                />
                <button onClick={commitTeleport}>Go</button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsTeleporting(true);
                  setTargetPositionInput(String(index + 1));
                }}
                className="step-index-badge"
                title="Click to jump this step to any position"
              >
                #{String(index + 1).padStart(2, "0")}
              </button>
            )}

            {step.type === "CLICK" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="step-type-tag click">
                  <MousePointer2 size={13} /> <span>Coordinate Click</span>
                </div>

                <div className="step-coord-pill">
                  <span>X</span>
                  <input
                    type="number"
                    value={step.xCoordinate || 0}
                    onChange={(e) => onUpdateStep(index, "xCoordinate", Number(e.target.value))}
                  />
                </div>

                <div className="step-coord-pill">
                  <span>Y</span>
                  <input
                    type="number"
                    value={step.yCoordinate || 0}
                    onChange={(e) => onUpdateStep(index, "yCoordinate", Number(e.target.value))}
                  />
                </div>

                <button onClick={() => onSniperMode(index)} className="step-sniper-btn" title="Pick Coordinate on Screen">
                  <Target size={14} className="sniper-icon" /> <span>Sniper</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
                <div className={`step-type-tag ${isCustomProc ? "macro" : "action"}`}>
                  {isCustomProc ? <Layers size={13} /> : <Zap size={13} />}
                  <span>{isCustomProc ? "Sub-Routine" : "System Action"}</span>
                </div>

                <ModernSelect
                  value={step.actionName || "CTRL_A"}
                  onChange={handleActionChange}
                  groups={optionGroups}
                  onOpenChange={handleOpenChange}
                />
              </div>
            )}
          </div>

          {/* RIGHT: DELAY + DUPLICATE + REORDER + DELETE */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className="step-delay-pill" title="Wait delay before executing this step">
              <Clock size={12} color="#2563eb" />
              <input
                type="number"
                step="0.1"
                value={step.delay}
                onChange={(e) => onUpdateStep(index, "delay", Number(e.target.value))}
              />
              <span>sec</span>
            </div>

            <button onClick={() => onDuplicateStep(index)} className="step-tool-btn duplicate" title="Duplicate step directly below">
              <CopyPlus size={13} /> <span>Duplicate</span>
            </button>

            <div className="step-arrows-group">
              <button onClick={() => onMoveStep(index, "up")} disabled={index === 0} title="Move Up">
                <ChevronUp size={14} />
              </button>
              <button onClick={() => onMoveStep(index, "down")} disabled={isLast} title="Move Down">
                <ChevronDown size={14} />
              </button>
            </div>

            <button onClick={() => onRemoveStep(index)} className="step-tool-btn delete" title="Delete Step">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* EXPANDABLE PARAMETER DRAWERS */}
        {isFocusWin && (
          <div className="step-param-drawer">
            <span className="drawer-label">Window Title Keyword:</span>
            <input
              type="text"
              value={step.parameter || ""}
              onChange={(e) => onUpdateStep(index, "parameter", e.target.value)}
              placeholder="e.g., Citrix, Chrome, Excel"
            />
          </div>
        )}

        {motherConfig && (
          <div className="step-param-drawer" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => handleBrowseFolderForParam(step.parameter || "{}", "Project_Data.csv")} className="drawer-browse-btn">
                <FolderOpen size={13} /> Choose Mother Folder
              </button>
              <span className="drawer-path-text">{motherConfig.folder}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="drawer-label">Output CSV Filename:</span>
              <input
                type="text"
                value={motherConfig.filename || ""}
                onChange={(e) => onUpdateStep(index, "parameter", JSON.stringify({ ...motherConfig, filename: e.target.value }))}
                placeholder="e.g., Taux_Raccordement.csv"
              />
            </div>
          </div>
        )}

        {saveData && (
          <div className="step-param-drawer" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => handleBrowseFolderForParam(step.parameter || "{}", "Extracted_Data.csv")} className="drawer-browse-btn">
                <FolderOpen size={13} /> Select Destination Folder
              </button>
              <span className="drawer-path-text">{saveData.folder || "C:\\Nexus_Data"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="drawer-label">File Name:</span>
              <input
                type="text"
                value={saveData.filename || ""}
                onChange={(e) => onUpdateStep(index, "parameter", JSON.stringify({ ...saveData, filename: e.target.value }))}
                placeholder="e.g., My_Data.csv"
              />
            </div>
          </div>
        )}

        {isTypeText && (
          <div className="step-param-drawer">
            <span className="drawer-label">Text to Paste:</span>
            <input
              type="text"
              value={step.parameter || ""}
              onChange={(e) => onUpdateStep(index, "parameter", e.target.value)}
              placeholder="Enter text or URL..."
            />
          </div>
        )}

        {isCmdExecute && (
          <div className="step-param-drawer">
            <span className="drawer-label">OS Shell Command:</span>
            <input
              type="text"
              value={step.parameter || ""}
              onChange={(e) => onUpdateStep(index, "parameter", e.target.value)}
              placeholder='e.g., start chrome --incognito "https://..."'
            />
          </div>
        )}
      </div>

      {/* HOVER INSERTION DIVIDER */}
      <div className="step-insert-divider">
        <div className="step-insert-Namespace">
          <button onClick={() => onAddAction("CLICK", index + 1)}>+ Insert Click Here</button>
          <span>•</span>
          <button onClick={() => onAddAction("ACTION", index + 1)}>+ Insert Action Here</button>
        </div>
      </div>
    </div>
  );
});

export default function StepEditor({
  steps,
  templates,
  onUpdateStep,
  onAddAction,
  onRemoveStep,
  onDuplicateStep,
  onMoveStepToPosition,
  onSniperMode,
  onMoveStep,
}: StepEditorProps) {
  const [openDropdownStepIndex, setOpenDropdownStepIndex] = useState<number | null>(null);

  // Only the "Custom Macros" group depends on data — rebuilt only when templates change
  const optionGroups = useMemo<OptionGroup[]>(
    () => [
      {
        groupLabel: "Custom Macros",
        options: templates
          .filter((t) => t.name.startsWith("PROC_"))
          .map((t) => ({ value: `CUSTOM_PROC_${t.name}`, label: `RUN: ${t.name}`, type: "custom" as const })),
      },
      ...BUILTIN_GROUPS,
    ],
    [templates]
  );

  const handleDropdownChange = useCallback((index: number, open: boolean) => {
    setOpenDropdownStepIndex((prev) => (open ? index : prev === index ? null : prev));
  }, []);

  const totalTime = useMemo(() => steps.reduce((acc, s) => acc + (s.delay || 0), 0), [steps]);

  return (
    <div className="step-studio-container">
      {/* STUDIO HEADER BAR */}
      <div className="step-studio-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="studio-icon-box">
              <Zap size={18} color="#2563eb" />
            </div>
            <h2 style={{ color: "#0f172a", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.4px", margin: 0 }}>
              Workflow Architecture
            </h2>
            <span className="studio-count-pill">{steps.length} Steps</span>
            <span className="studio-time-pill">~{Math.round(totalTime)}s Total</span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500, marginTop: "4px", marginLeft: "44px" }}>
            Click any step index badge <code style={{ color: "#2563eb", fontWeight: 700 }}>[#]</code> to teleport it to another position instantly.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => onAddAction("CLICK")} className="studio-add-btn click">
            <MousePointer2 size={14} /> <span>+ Add Click</span>
          </button>
          <button onClick={() => onAddAction("ACTION")} className="studio-add-btn action">
            <Plus size={14} /> <span>+ Add Action / Macro</span>
          </button>
        </div>
      </div>

      {/* TIMELINE TRACK */}
      <div className="step-timeline-wrapper">
        <div className="step-timeline-rail" />

        {steps.map((step, index) => (
          <StepRow
            key={index}
            step={step}
            index={index}
            isLast={index === steps.length - 1}
            isDropdownOpen={openDropdownStepIndex === index}
            optionGroups={optionGroups}
            totalSteps={steps.length}
            onUpdateStep={onUpdateStep}
            onAddAction={onAddAction}
            onRemoveStep={onRemoveStep}
            onDuplicateStep={onDuplicateStep}
            onMoveStepToPosition={onMoveStepToPosition}
            onSniperMode={onSniperMode}
            onMoveStep={onMoveStep}
            onDropdownChange={handleDropdownChange}
          />
        ))}
      </div>
    </div>
  );
}
