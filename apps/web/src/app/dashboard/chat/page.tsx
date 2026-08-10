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
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="max-w-2xl mx-auto mt-8">
            <div className="text-center mb-12">
              <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 bg-black shadow-xl animate-float">
                <Bot size={36} color="#c3f53c" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-outfit font-black mb-3 text-black">
                How can I help you today?
              </h2>
              <p className="text-gray-600 text-sm font-medium">
                Ask me anything about farming — crop advice, disease, weather, schemes or market prices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.text}
                  onClick={() => sendMessage(q.text)}
                  className="bg-white border border-gray-100 p-5 rounded-2xl text-left hover:border-black hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gray-50 group-hover:bg-black transition-colors">
                    <q.icon size={18} className="text-gray-700 group-hover:text-[#c3f53c]" strokeWidth={2.5} />
                  </div>
                  <p className="text-[15px] font-semibold text-black leading-snug">
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
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 bg-black shadow-sm">
                      <Bot size={18} color="#c3f53c" strokeWidth={2.5} />
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
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 bg-[#c3f53c] shadow-sm">
                      <User size={18} color="black" strokeWidth={2.5} />
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
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-black shadow-sm">
                  <Bot size={18} color="#c3f53c" strokeWidth={2.5} />
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
      <div className="px-6 py-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-3 p-2 pl-2 rounded-full bg-white shadow-xl shadow-gray-200/50 border border-gray-100 transition-shadow focus-within:shadow-2xl focus-within:border-gray-200"
          >
            {messages.length > 0 && (
              <button
                type="button"
                onClick={startNewConversation}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 flex-shrink-0 mb-1 ml-1"
                title="Clear Chat"
              >
                <Plus size={18} strokeWidth={2.5} className="rotate-45" />
              </button>
            )}
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
              className={`flex-1 bg-transparent outline-none resize-none text-[15px] font-medium leading-relaxed py-3 text-black placeholder:text-gray-400 ${messages.length === 0 ? 'pl-4' : 'pl-1'}`}
              style={{ maxHeight: "120px", minHeight: "24px" }}
            />
            <div className="flex items-center gap-2 flex-shrink-0 mb-1 mr-1">
              <button
                type="button"
                id="voice-btn"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-black"
                title="Voice input (coming soon)"
              >
                <Mic size={18} strokeWidth={2.5} />
              </button>
              <button
                id="send-btn"
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-black hover:bg-gray-800 text-[#c3f53c]"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </form>
          <p className="text-center text-xs mt-4 text-gray-400 font-medium">
            AI decisions are based on verified agricultural data. Always consult local experts for critical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
