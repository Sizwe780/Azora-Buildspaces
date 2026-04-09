"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, RotateCcw, GitBranch, ChevronRight } from "lucide-react";

interface Version {
  id: string;
  name: string;
  timestamp: string;
  author: string;
  changes: number;
  isCurrent: boolean;
}

export default function VersionHistory() {
  // Start with the initial auto-saved version; new versions are appended on save
  const [versions, setVersions] = useState<Version[]>([
    { id: "v1", name: "Current", timestamp: new Date().toLocaleTimeString(), author: "You", changes: 0, isCurrent: true },
  ]);
  const [selectedVersion, setSelectedVersion] = useState<string>("v1");

  // Listen for design save events to build real version history
  useEffect(() => {
    const handler = (e: Event) => {
      const { name, changes } = (e as CustomEvent).detail || {};
      setVersions(prev => {
        const updated = prev.map(v => ({ ...v, isCurrent: false }));
        const newVersion: Version = {
          id: `v${updated.length + 1}`,
          name: name || `Save ${updated.length + 1}`,
          timestamp: new Date().toLocaleTimeString(),
          author: "You",
          changes: changes || 1,
          isCurrent: true,
        };
        return [newVersion, ...updated];
      });
    };
    window.addEventListener('design:version-save', handler);
    return () => window.removeEventListener('design:version-save', handler);
  }, []);

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          Version History
        </h3>
      </div>

      <div className="space-y-1">
        {versions.map((version) => (
          <button
            key={version.id}
            onClick={() => setSelectedVersion(version.id)}
            className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
              selectedVersion === version.id
                ? "bg-white/[0.06] border border-white/10"
                : "hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium">{version.name}</span>
                {version.isCurrent && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                    Current
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {version.timestamp}
              </span>
              <span>{version.changes} changes</span>
            </div>
          </button>
        ))}
      </div>

      <div className="pt-3 border-t border-white/[0.06]">
        <Button size="sm" variant="ghost" className="w-full text-muted-foreground hover:text-white text-xs h-8">
          <RotateCcw className="w-3 h-3 mr-1.5" />
          Restore Selected Version
        </Button>
      </div>
    </div>
  );
}
