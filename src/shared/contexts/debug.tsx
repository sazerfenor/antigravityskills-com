"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "@/shared/contexts/app";

// ============================================================
// TYPES
// ============================================================

export interface DebugEntry {
  id: string;
  category: string;
  label: string;
  data: any;
  timestamp: Date;
}

interface DebugContextValue {
  // Data
  entries: DebugEntry[];
  
  // Actions
  pushDebug: (category: string, label: string, data: any) => void;
  clearDebug: () => void;
  clearCategory: (category: string) => void;
  
  // Panel visibility
  isPanelVisible: boolean;
  setPanelVisible: (visible: boolean) => void;
  togglePanel: () => void;
  
  // System state
  isEnabled: boolean;
}

const DebugContext = createContext<DebugContextValue | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface DebugProviderProps {
  children: React.ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const { user } = useAppContext();
  const searchParams = useSearchParams();
  
  // Use user.isAdmin field directly (not roles.includes)
  const isAdmin = user?.isAdmin === true;
  
  // Debug: Log admin status
  useEffect(() => {
    console.log('[DebugProvider] User:', user?.email, 'isAdmin field:', user?.isAdmin, 'Result:', isAdmin);
  }, [user, isAdmin]);
  
  // Debug entries storage
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  
  // Panel visibility (localStorage persistence)
  const [panelVisible, setPanelVisibleState] = useState(false);
  
  // Load visibility from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("debugPanelVisible");
    if (stored !== null) {
      setPanelVisibleState(stored === "true");
    } else if (isAdmin) {
      // Default: show for admins
      setPanelVisibleState(true);
    }
  }, [isAdmin]);
  
  // Determine if debug system is enabled (URL override > isAdmin)
  const isEnabled = useMemo(() => {
    const urlDebug = searchParams.get("debug");
    if (urlDebug === "0") return false;
    if (urlDebug === "1") return isAdmin; // Still require admin even with ?debug=1
    return isAdmin;
  }, [searchParams, isAdmin]);
  
  // Determine if panel should be visible
  const isPanelVisible = useMemo(() => {
    if (!isEnabled) return false;
    const urlDebug = searchParams.get("debug");
    if (urlDebug === "0") return false;
    return panelVisible;
  }, [isEnabled, searchParams, panelVisible]);
  
  // Actions
  const pushDebug = useCallback((category: string, label: string, data: any) => {
    if (!isEnabled) return;
    
    const entry: DebugEntry = {
      id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      label,
      data,
      timestamp: new Date(),
    };
    
    setEntries((prev) => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
    
    // Also log to console for convenience
    console.groupCollapsed(`🐛 [Debug] ${category}: ${label}`);
    console.log(data);
    console.groupEnd();
  }, [isEnabled]);
  
  const clearDebug = useCallback(() => {
    setEntries([]);
  }, []);
  
  const clearCategory = useCallback((category: string) => {
    setEntries((prev) => prev.filter((e) => e.category !== category));
  }, []);
  
  const setPanelVisible = useCallback((visible: boolean) => {
    setPanelVisibleState(visible);
    localStorage.setItem("debugPanelVisible", String(visible));
  }, []);
  
  const togglePanel = useCallback(() => {
    setPanelVisible(!panelVisible);
  }, [panelVisible, setPanelVisible]);
  
  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    if (!isEnabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        togglePanel();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnabled, togglePanel]);
  
  const value: DebugContextValue = {
    entries,
    pushDebug,
    clearDebug,
    clearCategory,
    isPanelVisible,
    setPanelVisible,
    togglePanel,
    isEnabled,
  };
  
  return (
    <DebugContext.Provider value={value}>
      {children}
    </DebugContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useDebug() {
  const context = useContext(DebugContext);
  
  if (!context) {
    // Return a no-op version if used outside provider
    return {
      entries: [],
      pushDebug: () => {},
      clearDebug: () => {},
      clearCategory: () => {},
      isPanelVisible: false,
      setPanelVisible: () => {},
      togglePanel: () => {},
      isEnabled: false,
    };
  }
  
  return context;
}
