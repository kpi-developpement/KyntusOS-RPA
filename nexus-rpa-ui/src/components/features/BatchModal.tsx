"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, X, FileText, Play, Check } from "lucide-react";
import Button from "../ui/Button";

interface BatchModalProps {
  templateName: string;
  onClose: () => void;
  onStartBatch: (files: string[]) => void;
}

export default function BatchModal({ templateName, onClose, onStartBatch }: BatchModalProps) {
  const [files, setFiles] = useState<{ path: string; name: string; selected: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleBrowseFolder = async () => {
    try {
      setIsLoading(true);
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readDir } = await import('@tauri-apps/plugin-fs');

      const selectedFolder = await open({
        directory: true,
        multiple: false,
      });

      if (selectedFolder && typeof selectedFolder === 'string') {
        const entries = await readDir(selectedFolder);
        
        const fileEntries = entries
          .filter(entry => entry.isFile)
          .map(entry => ({
            path: `${selectedFolder}\\${entry.name}`,
            name: entry.name || "Unknown File",
            selected: true 
          }));

        setFiles(fileEntries);
      }
    } catch (error) {
      console.error("Failed to read folder:", error);
      alert("Error reading folder. Make sure you are running in Tauri.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFile = (index: number) => {
    const newFiles = [...files];
    newFiles[index].selected = !newFiles[index].selected;
    setFiles(newFiles);
  };

  const handleStart = () => {
    const selectedPaths = files.filter(f => f.selected).map(f => f.path);
    if (selectedPaths.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    onStartBatch(selectedPaths);
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-content"
      >
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <FolderOpen size={22} color="#2563eb" /> Batch Directory Injection
            </h2>
            <p style={{ color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: '4px', margin: 0 }}>
              TARGET WORKFLOW // {templateName}
            </p>
          </div>
          <button onClick={onClose} className="titlebar-btn">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <button 
            onClick={handleBrowseFolder} 
            style={{ 
              width: '100%', 
              padding: '16px', 
              borderRadius: '14px',
              border: '1.5px dashed #60a5fa', 
              background: '#f0f7ff',
              color: '#2563eb',
              fontWeight: 800,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={20} color="#2563eb" /> 
            {isLoading ? "SCANNING DIRECTORY..." : "SELECT TARGET FOLDER TO INJECT"}
          </button>

          {files.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 10px 4px', borderBottom: '1px solid #dbeafe', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Found {files.length} files</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>{files.filter(f => f.selected).length} Selected</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                {files.map((file, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => toggleFile(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: file.selected ? '#eff6ff' : '#f8fafc',
                      border: file.selected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div className={`luxe-checkbox ${file.selected ? 'checked' : ''}`}>
                      {file.selected && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <FileText size={16} color={file.selected ? "#2563eb" : "#94a3b8"} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: file.selected ? '#0f172a' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleStart} disabled={files.length === 0 || files.filter(f => f.selected).length === 0}>
            <Play size={16} fill="currentColor" /> START BATCH EXECUTION
          </Button>
        </div>
      </motion.div>
    </div>
  );
}