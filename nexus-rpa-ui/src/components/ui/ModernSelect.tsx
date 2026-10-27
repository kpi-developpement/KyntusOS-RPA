"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Cpu, Zap, Layers, HardDriveDownload, Monitor, ShieldCheck } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  type: "custom" | "builtin" | "basic";
}

export interface OptionGroup {
  groupLabel: string;
  options: SelectOption[];
}

interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  groups: OptionGroup[];
  onOpenChange?: (isOpen: boolean) => void; // NOTIFIE LE PARENT QUAND LA DROPDOWN EST OUVERTE
}

export default function ModernSelect({ value, onChange, groups, onOpenChange }: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  let selectedOption: SelectOption = groups[0]?.options[0];
  for (const group of groups) {
    const found = group.options.find(opt => opt.value === value);
    if (found) {
      selectedOption = found;
      break;
    }
  }

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onOpenChange) onOpenChange(nextState);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string, val: string) => {
    if (type === "custom") return <Layers size={13} color="#059669" />;
    if (val.includes("MOTHER") || val.includes("CLIPBOARD") || val.includes("CSV")) {
      return <HardDriveDownload size={13} color="#2563eb" />;
    }
    if (val.includes("WINDOW") || val.includes("CHROME") || val.includes("ALT") || val.includes("CTRL")) {
      return <Monitor size={13} color="#0284c7" />;
    }
    if (val.includes("LOGIN") || val.includes("AUTH")) {
      return <ShieldCheck size={13} color="#9333ea" />;
    }
    return <Zap size={13} color="#64748b" />;
  };

  return (
    <div 
      ref={dropdownRef}
      style={{ 
        position: 'relative', 
        width: '320px',
        zIndex: isOpen ? 99999 : 1
      }} 
    >
      {/* TRIGGER INPUT */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          border: isOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1', 
          padding: '6px 12px', 
          borderRadius: '8px', 
          background: '#f8fafc', 
          fontFamily: "'Fira Code', monospace", 
          fontSize: '12px', 
          cursor: 'pointer', 
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.12)' : 'none'
        }}
        onClick={toggleDropdown}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {getIcon(selectedOption.type, selectedOption.value)}
          <span style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedOption.label}
          </span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown size={14} color="#64748b" style={{ flexShrink: 0, marginLeft: '6px' }} />
        </motion.div>
      </div>

      {/* DROPDOWN POPUP */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              width: '100%', 
              marginTop: '6px', 
              background: '#ffffff', 
              border: '1.5px solid #cbd5e1', 
              borderRadius: '12px', 
              boxShadow: '0 25px 60px -10px rgba(15, 23, 42, 0.25), 0 8px 20px rgba(0, 0, 0, 0.08)', 
              zIndex: 999999, // Z-INDEX MAXIMAL
              overflow: 'hidden' 
            }}
          >
            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px 0' }}>
              {groups.map((group, groupIdx) => (
                <div key={groupIdx} style={{ marginBottom: '6px' }}>
                  
                  {/* GROUP HEADER */}
                  <div style={{ 
                    padding: '6px 12px', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    color: '#64748b', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #f1f5f9', 
                    borderBottom: '1px solid #f1f5f9' 
                  }}>
                    {group.groupLabel}
                  </div>
                  
                  {/* OPTIONS LIST */}
                  {group.options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                      <div
                        key={option.value}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '8px 12px', 
                          fontSize: '12px', 
                          fontFamily: "'Fira Code', monospace", 
                          cursor: 'pointer',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          fontWeight: isSelected ? 800 : 500,
                          transition: 'all 0.1s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.color = '#0f172a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#334155';
                          }
                        }}
                        onClick={() => {
                          onChange(option.value);
                          closeDropdown();
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          {getIcon(option.type, option.value)}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {option.label}
                          </span>
                        </div>
                        {isSelected && <Check size={14} color="#2563eb" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}