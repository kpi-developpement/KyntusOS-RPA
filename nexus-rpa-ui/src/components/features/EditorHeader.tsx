"use client";

import { Save, Terminal } from "lucide-react";
import Button from "../ui/Button";

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
      maxWidth: '1000px',
      margin: '0 auto 25px auto'
    }}>
      
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button variant="ghost" size="md" onClick={onDiscard} style={{ color: '#dc2626' }}>
          DISCARD
        </Button>
        <Button variant="success" size="md" onClick={onSave}>
          <Save size={16} /> COMMIT {isMacro ? "MACRO" : "SEQUENCE"}
        </Button>
      </div>

    </div>
  );
}