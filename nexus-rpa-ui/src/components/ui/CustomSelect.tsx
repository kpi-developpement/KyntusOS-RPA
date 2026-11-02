"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Cpu, Zap, Layers } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  type: "custom" | "builtin" | "basic";
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

export default function CustomSelect({ value, onChange, options }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    if (type === "custom") return <Layers size={14} className="text-emerald-400" />;
    if (type === "builtin") return <Cpu size={14} className="text-orange-400" />;
    return <Zap size={14} className="text-purple-400" />;
  };

  const getColorClass = (type: string) => {
    if (type === "custom") return "text-emerald-400 border-emerald-500/30";
    if (type === "builtin") return "text-orange-400 border-orange-500/30";
    return "text-purple-400 border-purple-500/30";
  };

  return (
    <div className="relative w-[300px]" ref={dropdownRef}>
      <div 
        className={`flex items-center justify-between bg-white border px-4 py-2.5 rounded-lg transition-all duration-300 ${getColorClass(selectedOption.type)} hover:bg-blue-50`}
        style={{ fontFamily: "'Fira Code', monospace", fontSize: '13px', boxShadow: 'inset 0 2px 10px rgba(37,99,235,0.06)', cursor: 'none' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {getIcon(selectedOption.type)}
          <span className="font-medium tracking-wide">{selectedOption.label}</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-slate-500" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 w-full mt-2 bg-white border border-blue-200 rounded-lg shadow-[0_10px_40px_rgba(37,99,235,0.18)] z-50 overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
              {options.map((option) => {
                const isSelected = value === option.value;
                
                return (
                  <div
                    key={option.value}
                    className={`flex items-center justify-between px-4 py-3 text-sm transition-all duration-200 border-l-2 ${
                      isSelected 
                        ? "bg-white/10 border-blue-500 font-bold" 
                        : "border-transparent text-slate-300 hover:bg-white/5 hover:border-slate-500"
                    }`}
                    style={{ fontFamily: "'Fira Code', monospace", fontSize: '12px', cursor: 'none' }}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {getIcon(option.type)}
                      <span className={isSelected ? "text-white" : ""}>{option.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-blue-400" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}