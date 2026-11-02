"use client";

import { memo, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Zap, Layers, HardDriveDownload, Monitor, ShieldCheck } from "lucide-react";

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

const getIcon = (type: string, val: string) => {
  if (type === "custom") return <Layers size={13} color="#0284c7" />;
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

function ModernSelect({ value, onChange, groups, onOpenChange }: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const selectedOption = useMemo<SelectOption>(() => {
    for (const group of groups) {
      const found = group.options.find((opt) => opt.value === value);
      if (found) return found;
    }
    return groups[0]?.options[0] ?? { value, label: value, type: "basic" };
  }, [groups, value]);

  const setOpen = useCallback((next: boolean) => {
    setIsOpen(next);
    onOpenChangeRef.current?.(next);
  }, []);

  // Outside-click / Esc listeners exist ONLY while this dropdown is open
  // (before: every step row kept a permanent document listener).
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    // bring the selected option into view
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(".nx-select-option.is-selected")?.scrollIntoView({ block: "center" });
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, setOpen]);

  return (
    <div ref={dropdownRef} className={`nx-select ${isOpen ? "is-open" : ""}`}>
      {/* TRIGGER */}
      <div className="nx-select-trigger" onClick={() => setOpen(!isOpen)} role="button" aria-expanded={isOpen}>
        <div className="nx-select-current">
          {getIcon(selectedOption.type, selectedOption.value)}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown size={14} className="nx-select-chevron" />
      </div>

      {/* DROPDOWN POPUP — only opacity/transform animate (GPU) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="nx-select-popup"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 600, damping: 38, mass: 0.6 }}
            style={{ transformOrigin: "top center" }}
          >
            <div ref={listRef} className="nx-select-list">
              {groups.map((group, groupIdx) =>
                group.options.length === 0 ? null : (
                  <div key={groupIdx} className="nx-select-group">
                    <div className="nx-select-group-label">{group.groupLabel}</div>
                    {group.options.map((option) => {
                      const isSelected = value === option.value;
                      return (
                        <div
                          key={option.value}
                          className={`nx-select-option ${isSelected ? "is-selected" : ""}`}
                          onClick={() => {
                            onChange(option.value);
                            setOpen(false);
                          }}
                        >
                          <div className="nx-select-option-main">
                            {getIcon(option.type, option.value)}
                            <span>{option.label}</span>
                          </div>
                          {isSelected && <Check size={14} color="#2563eb" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ModernSelect);
