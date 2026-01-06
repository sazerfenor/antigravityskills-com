"use client";

import * as React from "react";
import { useState } from "react";
import { Bug, X, Copy, Check, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useDebug, DebugEntry } from "@/shared/contexts/debug";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

// ============================================================
// DEBUG PANEL COMPONENT
// ============================================================

export function DebugPanel() {
  const { entries, isPanelVisible, setPanelVisible, clearDebug, isEnabled } = useDebug();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  
  // Don't render anything if debug is not enabled
  if (!isEnabled) return null;
  
  const toggleEntry = (id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleCopyAll = async () => {
    const text = entries
      .map((e) => {
        const time = e.timestamp.toLocaleTimeString();
        return `[${time}] ${e.category}: ${e.label}\n${JSON.stringify(e.data, null, 2)}`;
      })
      .join("\n\n" + "=".repeat(50) + "\n\n");
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "prompt-optimize": "bg-purple-500/20 text-purple-300 border-purple-500/30",
      "image-generate": "bg-green-500/20 text-green-300 border-green-500/30",
      "seo-generate": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      "auth": "bg-blue-500/20 text-blue-300 border-blue-500/30",
      "api": "bg-orange-500/20 text-orange-300 border-orange-500/30",
      "payment": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      "chat": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      "community": "bg-pink-500/20 text-pink-300 border-pink-500/30",
      "upload": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      "error": "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return colors[category] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
  };
  
  // Collapsed state: just show floating button
  if (!isPanelVisible) {
    return (
      <button
        onClick={() => setPanelVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] p-3 rounded-full bg-background/90 backdrop-blur-xl border border-border-medium shadow-lg hover:bg-background hover:scale-110 transition-all duration-200"
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        <Bug className="h-5 w-5 text-primary" />
      </button>
    );
  }
  
  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] transition-all duration-300",
        isExpanded ? "w-[500px] h-[60vh]" : "w-80 h-auto max-h-[50vh]"
      )}
    >
      <div className="bg-background/95 backdrop-blur-xl border border-border-medium rounded-xl shadow-2xl overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-background/50">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Debug Panel</span>
            <Badge variant="outline" className="text-xs">
              {entries.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyAll}
              disabled={entries.length === 0}
              title="Copy All"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearDebug}
              disabled={entries.length === 0}
              title="Clear All"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPanelVisible(false)}
              title="Close (Ctrl+Shift+D)"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bug className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No debug entries yet</p>
              <p className="text-xs opacity-60">Use pushDebug() to add entries</p>
            </div>
          ) : (
            entries.map((entry) => (
              <DebugEntryCard
                key={entry.id}
                entry={entry}
                isExpanded={expandedEntries.has(entry.id)}
                onToggle={() => toggleEntry(entry.id)}
                formatTime={formatTime}
                getCategoryColor={getCategoryColor}
              />
            ))
          )}
        </div>
        
        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border-subtle bg-background/30">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            Ctrl+Shift+D to toggle • ?debug=0 to hide
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DEBUG ENTRY CARD
// ============================================================

interface DebugEntryCardProps {
  entry: DebugEntry;
  isExpanded: boolean;
  onToggle: () => void;
  formatTime: (date: Date) => string;
  getCategoryColor: (category: string) => string;
}

function DebugEntryCard({
  entry,
  isExpanded,
  onToggle,
  formatTime,
  getCategoryColor,
}: DebugEntryCardProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="border border-border-subtle rounded-lg overflow-hidden bg-background/30">
      {/* Entry Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-background/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          )}
          
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", getCategoryColor(entry.category))}
          >
            {entry.category}
          </Badge>
          
          <span className="text-xs font-medium truncate">{entry.label}</span>
        </div>
        
        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0 ml-2">
          {formatTime(entry.timestamp)}
        </span>
      </button>
      
      {/* Entry Content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="relative">
            <pre className="text-[10px] bg-black/30 rounded p-2 overflow-x-auto max-h-60 font-mono text-muted-foreground">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
            
            <button
              onClick={handleCopy}
              className="absolute top-1 right-1 p-1.5 rounded bg-background/80 hover:bg-background transition-colors"
              title="Copy"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
