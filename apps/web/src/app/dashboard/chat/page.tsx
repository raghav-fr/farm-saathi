"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, Bot, User, Mic, Plus, MessageSquare,
  Sprout, CloudRain, TrendingUp, Shield, Camera, Leaf
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { chatApi, type ChatResponse } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  sources?: string[];
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  { icon: Sprout, text: "What crop should I grow this season?", color: "#22c55e" },
  { icon: CloudRain, text: "Will it rain this week?", color: "#38bdf8" },
  { icon: TrendingUp, text: "Should I sell my produce now?", color: "#facc15" },
  { icon: Shield, text: "What government schemes can I apply for?", color: "#f472b6" },
  { icon: Camera, text: "How do I detect crop diseases?", color: "#86efac" },
  { icon: Leaf, text: "How can I improve my soil health?", color: "#fb923c" },
];

const INTENT_COLORS: Record<string, string> = {
  weather: "#38bdf8",
  crop_recommendation: "#22c55e",
  market: "#facc15",
  scheme: "#f472b6",
  disease_detection: "#86efac",
  soil: "#fb923c",
  general_agriculture: "#a78bfa",
};

export default function ChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data } = await chatApi.send({
        message: text,
        conversation_id: convId,
        language: profile?.language || "en",
      });

      if (!convId) setConvId(data.conversation_id);

      const aiMsg: Message = {
        id: data.message_id,
        role: "assistant",
        content: data.answer,
        intent: data.intent,
        sources: data.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: Date.now().toString() + "_err",
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please check your internet connection or try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConvId(undefined);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
          >
            <Bot size={18} color="white" />
          </div>
          <div>
            <h1 className="font-outfit font-bold text-base">FarmSaathi AI</h1>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#22c55e" }}
              />
              Powered by Qwen3:4B · {profile?.language === "hi" ? "हिंदी" : profile?.language === "od" ? "ଓଡ଼ିଆ" : "English"}
            </div>
          </div>
        </div>
        <button
          id="new-chat-btn"
          onClick={startNewConversation}
          className="btn-ghost text-sm"
        >
          <Plus size={15} /> New Chat
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                <Bot size={28} color="white" />
              </div>
              <h2 className="text-2xl font-outfit font-bold mb-2">
                How can I help you today?
              </h2>
              <p style={{ color: "var(--text-muted)" }} className="text-sm">
                Ask me anything about farming — crop advice, disease, weather, schemes or market prices.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.text}
                  onClick={() => sendMessage(q.text)}
                  className="glass-card p-4 text-left hover:scale-[1.02] transition-all group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: `${q.color}18`, border: `1px solid ${q.color}30` }}
                  >
                    <q.icon size={16} color={q.color} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {q.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                    >
                      <Bot size={16} color="white" />
                    </div>
                  )}

                  <div className={`${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"} max-w-[80%]`}>
                    {/* Intent badge */}
                    {msg.role === "assistant" && msg.intent && msg.intent !== "general_agriculture" && (
                      <div className="mb-2">
                        <span
                          className="badge text-xs"
                          style={{
                            background: `${INTENT_COLORS[msg.intent] || "#86efac"}18`,
                            color: INTENT_COLORS[msg.intent] || "#86efac",
                          }}
                        >
                          {msg.intent.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}

                    {/* Content — supports markdown-like bold */}
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br/>"),
                      }}
                    />

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t text-xs flex flex-wrap gap-1" style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                        Sources: {msg.sources.join(", ")}
                      </div>
                    )}

                    <div className="mt-1 text-right text-xs opacity-40">
                      {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  {msg.role === "user" && (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ background: "rgba(34,197,94,0.2)" }}
                    >
                      <User size={16} style={{ color: "#22c55e" }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 justify-start"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                >
                  <Bot size={16} color="white" />
                </div>
                <div className="chat-bubble-ai flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: "#22c55e" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>FarmSaathi is thinking...</span>
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div
        className="px-6 py-4"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}
      >
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 p-3 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about farming... (English, हिंदी, ଓଡ଼ିଆ)"
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
              style={{ color: "var(--text-primary)", maxHeight: "120px", minHeight: "24px" }}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                id="voice-btn"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: "rgba(34,197,94,0.1)" }}
                title="Voice input (coming soon)"
              >
                <Mic size={16} style={{ color: "#22c55e" }} />
              </button>
              <button
                id="send-btn"
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                {isLoading ? (
                  <Loader2 size={16} color="white" className="animate-spin" />
                ) : (
                  <Send size={16} color="white" />
                )}
              </button>
            </div>
          </form>
          <p className="text-center text-xs mt-2" style={{ color: "var(--text-dim)" }}>
            AI decisions are based on verified agricultural data. Always consult local experts for critical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
