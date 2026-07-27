"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Download, RefreshCw, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";

interface LeadershipViewProps {
  report: string | null;
  warnings: string[];
  generating: boolean;
  onGenerate: () => void;
}

export default function LeadershipView({
  report,
  warnings,
  generating,
  onGenerate
}: LeadershipViewProps) {
  
  const handleDownload = () => {
    if (!report) return;
    
    // Create download link
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `leadership_update_${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/20">
      {/* Top Header */}
      <div className="px-8 py-4 border-b border-white/5 bg-zinc-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4.5 w-4.5 text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Executive Report Center</h2>
        </div>
        {report && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-200 font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Download Markdown
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        {!report && !generating ? (
          // Initial State - Prompt to generate
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-violet-600/10 to-indigo-500/10 border border-violet-500/20 flex items-center justify-center glow-indigo">
              <FileText className="h-7 w-7 text-violet-400" />
            </div>
            <div>
              <h3 className="text-zinc-200 font-medium text-sm">Generate Board-Level Leadership Update</h3>
              <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                Click below to compile all sales deals and work orders data. The AI will clean the datasets, calculate KPIs (Revenue, Pipeline, Win Rate, Operations velocity), structure risks, and output a professional, board-ready executive report.
              </p>
            </div>
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md shadow-violet-500/20 hover:shadow-violet-500/35 transition-all duration-200"
            >
              <Sparkles className="h-4 w-4" />
              Compile Report
            </button>
          </div>
        ) : generating ? (
          // Generating State
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <RefreshCw className="h-8 w-8 text-violet-400 animate-spin" />
            <div>
              <h3 className="text-zinc-200 font-medium text-sm">Retrieving & Cleaning Monday.com Data...</h3>
              <p className="text-zinc-500 text-xs mt-1">Calculating Win Rates, pipeline status, and running cross-board analysis.</p>
            </div>
          </div>
        ) : (
          // Render Report State
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Warning block summarizing data health */}
            {warnings.length > 0 ? (
              <div className="flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p className="font-semibold">Data Quality Warning</p>
                  <p className="text-amber-400/80 leading-relaxed text-[11px]">
                    This report was generated with {warnings.length} active data hygiene warnings (such as blank deal stages or malformed close dates). Verify the details in the **Missing Data & Warnings** section of the report.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                <div className="space-y-1">
                  <p className="font-semibold">Clean Data Report</p>
                  <p className="text-emerald-400/80 leading-relaxed text-[11px]">
                    Monday.com Deals and Work Orders boards have 100% data completion. No anomalies were detected during extraction.
                  </p>
                </div>
              </div>
            )}

            {/* Markdown Report Display */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-8 prose prose-invert prose-custom max-w-none shadow-xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report}
              </ReactMarkdown>
            </div>
            
            {/* Bottom Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onGenerate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-xs text-zinc-300 hover:bg-zinc-900 transition-all duration-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-generate
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-md shadow-violet-500/10 transition-all duration-200"
              >
                <Download className="h-3.5 w-3.5" />
                Export Markdown File
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
