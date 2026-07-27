"use client";

import React from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Database,
  Compass, 
  TrendingUp, 
  Activity,
  Calendar,
  AlertCircle
} from "lucide-react";

interface BoardInfo {
  id: string;
  name: string;
  item_count: number;
}

interface Diagnostics {
  deals_board?: BoardInfo;
  work_orders_board?: BoardInfo;
  warnings: string[];
}

interface SidebarProps {
  activeTab: "chat" | "leadership";
  setActiveTab: (tab: "chat" | "leadership") => void;
  diagnostics: Diagnostics | null;
  loadingDiagnostics: boolean;
  onSelectSuggestedQuestion: (question: string) => void;
  onRefreshDiagnostics: () => void;
}

const suggestedQuestions = [
  { text: "How is our pipeline?", icon: TrendingUp },
  { text: "Energy sector performance", icon: Compass },
  { text: "Delayed work orders", icon: AlertTriangle },
  { text: "Revenue forecast", icon: Calendar },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  diagnostics,
  loadingDiagnostics,
  onSelectSuggestedQuestion,
  onRefreshDiagnostics
}: SidebarProps) {
  return (
    <aside className="w-80 border-r border-white/5 bg-zinc-950/60 backdrop-blur-xl flex flex-col h-full overflow-hidden select-none">
      {/* Brand logo header */}
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
          <Activity className="h-5 w-5 text-white animate-pulse" />
        </div>
        <div>
          <h1 className="font-semibold text-sm tracking-wide text-zinc-100">monday BI Agent</h1>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Founder Cockpit v1</span>
        </div>
      </div>

      {/* Main navigation */}
      <div className="p-4 space-y-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === "chat"
              ? "bg-violet-600/15 text-violet-400 border-l-2 border-violet-500 shadow-inner"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Founder Chat Interface
        </button>
        <button
          onClick={() => setActiveTab("leadership")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium transition-all duration-200 ${
            activeTab === "leadership"
              ? "bg-violet-600/15 text-violet-400 border-l-2 border-violet-500 shadow-inner"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          Executive Leadership Update
        </button>
      </div>

      {/* Suggested prompts */}
      <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar space-y-4">
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block mb-2">Suggested Analytics</span>
          <div className="space-y-1.5">
            {suggestedQuestions.map((q, idx) => {
              const Icon = q.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestedQuestion(q.text)}
                  className="w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border border-white/[0.02] bg-white/[0.01] hover:bg-white/[0.04] text-[11px] text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                >
                  <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate">{q.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Board Diagnostics panel */}
      <div className="p-4 border-t border-white/5 bg-zinc-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Database className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Monday Data Health</span>
          </div>
          <button 
            disabled={loadingDiagnostics}
            onClick={onRefreshDiagnostics}
            className="text-[9px] text-violet-400 hover:text-violet-300 hover:underline disabled:opacity-50"
          >
            {loadingDiagnostics ? "Syncing..." : "Sync"}
          </button>
        </div>

        {diagnostics ? (
          <div className="space-y-2 text-[10px]">
            {/* Deals board diagnostics */}
            {diagnostics.deals_board && (
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05]">
                <div className="truncate pr-2">
                  <p className="font-medium text-zinc-300 truncate">{diagnostics.deals_board.name}</p>
                  <p className="text-zinc-500 text-[9px]">ID: {diagnostics.deals_board.id}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">
                    {diagnostics.deals_board.item_count} items
                  </span>
                </div>
              </div>
            )}

            {/* Work orders board diagnostics */}
            {diagnostics.work_orders_board && (
              <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.05]">
                <div className="truncate pr-2">
                  <p className="font-medium text-zinc-300 truncate">{diagnostics.work_orders_board.name}</p>
                  <p className="text-zinc-500 text-[9px]">ID: {diagnostics.work_orders_board.id}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold">
                    {diagnostics.work_orders_board.item_count} items
                  </span>
                </div>
              </div>
            )}

            {/* Warnings Alert */}
            {diagnostics.warnings && diagnostics.warnings.length > 0 ? (
              <div className="flex gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-[9px]">Hygiene Warnings ({diagnostics.warnings.length})</p>
                  <p className="text-[8px] text-amber-400/80 leading-normal mt-0.5">
                    Data quality issues were found (e.g. empty stages/dates). Check limits.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="font-semibold text-[9px]">Clean Data State</p>
                  <p className="text-[8px] text-emerald-400/80 leading-normal mt-0.5">
                    100% database health. No anomalies detected.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <span className="text-[10px] text-zinc-500">
              {loadingDiagnostics ? "Connecting to monday.com..." : "Offline. Check MONDAY_API_KEY"}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
