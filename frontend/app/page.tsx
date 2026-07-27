"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/sidebar";
import ChatInterface, { ChatMessage } from "@/components/chat-interface";
import LeadershipView from "@/components/leadership-view";
import { AlertCircle, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "leadership">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Leadership Report State
  const [report, setReport] = useState<string | null>(null);
  const [reportWarnings, setReportWarnings] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // General Error State
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch Board Diagnostics from Backend
  const fetchDiagnostics = useCallback(async () => {
    setLoadingDiagnostics(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_URL}/api/boards`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to fetch Monday board diagnostics");
      }
      const data = await res.json();
      setDiagnostics(data);
    } catch (err: any) {
      console.error("Diagnostics Error:", err);
      setApiError(err.message || "Failed to connect to backend server. Make sure FastAPI is running.");
    } finally {
      setLoadingDiagnostics(false);
    }
  }, []);

  // Fetch diagnostics on mount
  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  // Handle sending chat message
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);
    setApiError(null);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          // Extract roles and content from existing conversation history
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to generate AI response");
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev, 
        { 
          role: "assistant", 
          content: data.response, 
          warnings: data.warnings 
        }
      ]);
      
      // Update diagnostics if warnings changed
      if (data.warnings) {
        setDiagnostics((prev: any) => prev ? { ...prev, warnings: data.warnings } : null);
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      setApiError(err.message || "An error occurred during communication with the AI.");
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `### Error\n${err.message || "Failed to retrieve AI insights. Please check your credentials or backend logs."}`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Run suggested questions from sidebar
  const handleSelectSuggestedQuestion = (question: string) => {
    setActiveTab("chat");
    handleSendMessage(question);
  };

  // Compile Executive Leadership Report
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_URL}/api/leadership-summary`, {
        method: "POST"
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to generate Leadership Report");
      }

      const data = await res.json();
      setReport(data.report);
      setReportWarnings(data.warnings || []);
    } catch (err: any) {
      console.error("Report Generation Error:", err);
      setApiError(err.message || "Failed to compile the leadership update.");
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex bg-zinc-950 text-zinc-100 antialiased font-sans">
      {/* Decorative background glow circles for premium SaaS design */}
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-violet-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none" />

      {/* Floating alert bar for errors */}
      {apiError && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border border-red-500/20 bg-red-950/60 backdrop-blur-xl text-red-200 text-xs shadow-lg animate-bounce">
          <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
          <p className="font-medium">{apiError}</p>
          <button 
            onClick={() => setApiError(null)} 
            className="p-1 rounded-md hover:bg-white/5 text-red-400 hover:text-white transition-all ml-2"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        diagnostics={diagnostics}
        loadingDiagnostics={loadingDiagnostics}
        onSelectSuggestedQuestion={handleSelectSuggestedQuestion}
        onRefreshDiagnostics={fetchDiagnostics}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/50 backdrop-blur-sm">
        {activeTab === "chat" ? (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
          />
        ) : (
          <LeadershipView
            report={report}
            warnings={reportWarnings}
            generating={generatingReport}
            onGenerate={handleGenerateReport}
          />
        )}
      </main>
    </div>
  );
}
