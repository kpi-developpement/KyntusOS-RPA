"use client";

import { useState } from "react";
import { Save, Terminal, Server, CheckCircle2, XCircle } from "lucide-react";
import Button from "../ui/Button";
import { syncAxiosNode, orchestratorApi } from "@/orchestrator/api"; // 👈 T2ked mn l'massar s7i7!

interface EditorHeaderProps {
  templateName: string;
  setTemplateName: (name: string) => void;
  recordingType: "sequence" | "macro";
  onSave: () => void;
  onDiscard: () => void;
}

export default function EditorHeader({ templateName, setTemplateName, recordingType, onSave, onDiscard }: EditorHeaderProps) {
  const isMacro = recordingType === "macro";
  const labelColor = isMacro ? "#059669" : "#2563eb";
  const placeholder = isMacro ? "e.g., PROC_LOGIN_SYSTEM" : "e.g., DAILY_INDICATORS_PIPELINE";

  // 🔥 STATE DYAL L'SYNC M3A L'PC
  const [nodeIp, setNodeIp] = useState("http://10.10.125.37:9833");
  const [syncStatus, setSyncStatus] = useState<"IDLE" | "READY" | "OFFLINE" | "LOADING">("IDLE");

  const handleSyncNode = async () => {
    setSyncStatus("LOADING");
    // 1. Forci l'Proxy y-sifet l had l'IP
    syncAxiosNode(nodeIp);

    try {
      // 2. Sifet test (ping) l l'PC jdid bach tchouf wach hay wella miyet
      await orchestratorApi.getPlaybackStatus();
      setSyncStatus("READY");
    } catch (err) {
      console.error("Agent offline/Firewall block: ", err);
      setSyncStatus("OFFLINE");
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      background: '#ffffff', 
      border: `1px solid #cbd5e1`, 
      borderRadius: '16px', 
      padding: '18px 28px', 
      marginBottom: '25px', 
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      maxWidth: '1200px', // Zedt f l'3erd chwya bach yhez l'input
      margin: '0 auto 25px auto'
    }}>
      
      {/* LEFT: TEMPLATE NAME */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '40px' }}>
        <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} color={labelColor} />
          {isMacro ? "Macro Identifier" : "Sequence Identifier"}
        </label>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `2px solid ${labelColor}`, paddingBottom: '4px' }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 900, color: labelColor }}>{'>'}</span>
          <input
            type="text"
            placeholder={placeholder}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#0f172a', 
              fontSize: '1.4rem', 
              fontWeight: 700, 
              width: '100%', 
              fontFamily: "'Fira Code', monospace", 
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* MIDDLE: SYNC TARGET NODE (L'Aham) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        background: '#f8fafc', 
        padding: '8px 14px', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0',
        marginRight: '20px'
      }}>
        <Server size={15} color="#64748b" />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', letterSpacing: '1px' }}>NODE:</span>
        <input 
          type="text" 
          value={nodeIp}
          onChange={(e) => setNodeIp(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '0.85rem',
            fontFamily: "'Fira Code', monospace",
            color: '#0f172a',
            fontWeight: 700,
            width: '180px'
          }}
        />
        <Button 
          variant="primary" 
          size="sm" 
          onClick={handleSyncNode}
          disabled={syncStatus === "LOADING"}
          style={{ marginLeft: '4px', padding: '4px 10px', fontSize: '0.7rem' }}
        >
          {syncStatus === "LOADING" ? "SYNCING..." : "SYNC"}
        </Button>

        {/* STATUS INDICATOR */}
        {syncStatus === "READY" && <CheckCircle2 size={18} color="#10b981" title="Fleet Ready" />}
        {syncStatus === "OFFLINE" && <XCircle size={18} color="#ef4444" title="System Offline" />}
      </div>

      {/* RIGHT: ACTIONS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" size="md" onClick={onDiscard} style={{ color: '#dc2626' }}>
          DISCARD
        </Button>
        <Button variant="success" size="md" onClick={onSave}>
          <Save size={16} /> COMMIT
        </Button>
      </div>

    </div>
  );
}