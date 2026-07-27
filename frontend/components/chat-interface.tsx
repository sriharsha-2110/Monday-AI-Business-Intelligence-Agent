"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, AlertCircle, Terminal, HelpCircle } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: str;
  warnings?: string[];
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  isTyping
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950/20">
      {/* Top Cockpit Header */}
      <div className="px-8 py-4 border-b border-white/5 bg-zinc-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4.5 w-4.5 text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Founder Analytics Terminal</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Online & Ready</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center">
              <Terminal className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h3 className="text-zinc-200 font-medium text-sm">Ask your Business Intelligence Assistant</h3>
              <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                Query deals pipelines, sales metrics, sector distributions, project due dates, or check for bottlenecks. Try selecting an analytics question from the sidebar or typing a custom inquiry below.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div 
                key={idx} 
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in`}
              >
                {/* Message Body */}
                <div 
                  className={`max-w-3xl rounded-xl px-5 py-4 text-sm leading-relaxed border transition-all duration-200 ${
                    isUser 
                      ? "bg-zinc-900 border-white/10 text-zinc-200" 
                      : "glass-card border-white/[0.06] text-zinc-300 shadow-md"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-custom max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Data Warnings under AI Message */}
                {!isUser && msg.warnings && msg.warnings.length > 0 && (
                  <div className="max-w-3xl mt-2 w-full">
                    <details className="text-[10px] text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 cursor-pointer outline-none select-none transition-all duration-200">
                      <summary className="font-medium flex items-center gap-1.5 text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Data Quality Diagnostics ({msg.warnings.length} Warnings)
                      </summary>
                      <ul className="list-disc list-inside mt-2 space-y-1.5 pl-1 leading-normal border-t border-amber-500/10 pt-2 font-mono">
                        {msg.warnings.map((warn, wIdx) => (
                          <li key={wIdx}>{warn}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex flex-col items-start animate-fade-in">
            <div className="glass-card border-white/[0.06] rounded-xl px-5 py-4 flex items-center gap-1.5 shadow-md">
              <span className="h-2 w-2 rounded-full bg-violet-500 typing-dot"></span>
              <span className="h-2 w-2 rounded-full bg-violet-500 typing-dot"></span>
              <span className="h-2 w-2 rounded-full bg-violet-500 typing-dot"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <div className="p-6 border-t border-white/5 bg-zinc-950/40">
        <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isTyping ? "AI is processing metrics..." : "Ask about pipeline size, average deal size, win rates, sector revenue..."}
            rows={1}
            disabled={isTyping}
            className="w-full pl-5 pr-14 py-3.5 rounded-xl border border-white/10 bg-zinc-900/60 backdrop-blur-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 disabled:opacity-60 resize-none max-h-24 custom-scrollbar"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-3.5 p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all duration-200 disabled:bg-zinc-800 disabled:text-zinc-600 shadow shadow-violet-500/20"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
        <div className="text-center mt-2.5">
          <span className="text-[9px] text-zinc-600">
            Powered by GPT-4o-mini & Monday.com GraphQL API v2. Responses are quantitative and strategic.
          </span>
        </div>
      </div>
    </div>
  );
}
