"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, Bot, User, Mic, Plus, MessageSquare,
  Sprout, CloudRain, TrendingUp, Shield, Camera, Leaf, Trash2, Menu, X, PanelLeft, PanelLeftClose
} from "lucide-react";
import { CustomSelect } from "@/components/CustomSelect";
import { FormattedText } from "@/components/FormattedText";
import { useAuth } from "@/context/AuthContext";
import { chatApi, type ChatResponse } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  sources?: string[];
  timestamp: Date;
  image?: string;
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
  const [conversations, setConversations] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await chatApi.getConversations();
      setConversations(data);
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  };

  const loadConversation = async (id: string) => {
    if (convId === id) return;
    setConvId(id);
    setIsLoading(true);
    setMessages([]);
    try {
      const { data } = await chatApi.getMessages(id);
      const formatted: Message[] = data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt),
        image: m.image,
        intent: m.intent,
        sources: m.sources,
      }));
      setMessages(formatted.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(id);
    try {
      await chatApi.deleteConversation(id);
      if (convId === id) startNewConversation();
      await fetchConversations();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setSelectedImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !selectedImage) || isLoading) return;

    const currentImage = selectedImage;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text || "What is in this image?",
      timestamp: new Date(),
      image: currentImage || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const base64Image = currentImage ? currentImage.split(',')[1] : undefined;
      const { data } = await chatApi.send({
        message: text || "What is in this image?",
        conversation_id: convId,
        language: profile?.language || "en",
        image: base64Image,
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
      
      // Refresh sidebar if it's a new conversation
      if (!convId) fetchConversations();
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
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-[var(--bg-primary)] p-4 md:p-6 gap-4 md:gap-6">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <div 
        className={`${sidebarOpen ? 'w-72 border border-gray-200/60 shadow-xl' : 'w-0 border-0 shadow-none'} flex flex-col bg-[var(--bg-primary)] rounded-3xl transition-all duration-300 overflow-hidden shrink-0 absolute md:relative z-30 h-full`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200/60 shrink-0">
          <button 
            onClick={startNewConversation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-[#c3f53c] font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> New Chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="ml-3 p-2 bg-white/50 hover:bg-white rounded-xl text-gray-500 shadow-sm border border-transparent hover:border-gray-200 transition-all hidden md:block" title="Close Sidebar">
            <PanelLeftClose size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-3 p-2 bg-white/50 hover:bg-white rounded-xl text-gray-500 shadow-sm border border-transparent">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {conversations.length === 0 && (
            <div className="text-center text-xs text-gray-400 mt-4 font-medium">No previous chats</div>
          )}
          {conversations.map(c => (
            <div 
              key={c.id} 
              onClick={() => loadConversation(c.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${convId === c.id ? 'bg-gray-100 shadow-inner' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={15} className={`${convId === c.id ? 'text-black' : 'text-gray-400'} shrink-0`} />
                <span className={`text-sm font-medium truncate ${convId === c.id ? 'text-black' : 'text-gray-700'}`}>{c.title}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteConversation(e, c.id)}
                disabled={deletingId === c.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-100"
                title="Delete Chat"
              >
                {deletingId === c.id ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden z-20">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Toggle Sidebar Button */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2.5 bg-white shadow-md border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 hover:text-black"
            title="Open History"
          >
            <PanelLeft size={18} strokeWidth={2.5} />
          </button>
        )}

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 pt-16 md:pt-6 no-scrollbar">
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
                    <FormattedText 
                      text={msg.content} 
                      className="text-sm leading-relaxed whitespace-pre-wrap" 
                    />
                    
                    {msg.image && (
                      <div className="mt-2">
                        <img src={msg.image} alt="User upload" className="rounded-xl border max-w-[200px]" />
                      </div>
                    )}

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
      <div className="px-4 md:px-6 py-4 pb-6">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col p-2 pl-2 rounded-3xl bg-white shadow-xl shadow-gray-200/50 border border-gray-100 transition-shadow focus-within:shadow-2xl focus-within:border-gray-200"
          >
            {selectedImage && (
              <div className="relative inline-block m-2 self-start">
                <img src={selectedImage} alt="Preview" className="h-20 rounded-xl object-cover border" />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 shadow hover:bg-gray-800 transition-colors"
                >
                  <Plus size={14} className="rotate-45" />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-3">
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
                placeholder="Message FarmSaathi..."
                disabled={isLoading}
                className={`flex-1 min-w-0 w-full overflow-x-hidden bg-transparent outline-none resize-none text-[15px] font-medium leading-relaxed py-3 text-black placeholder:text-gray-400 ${messages.length === 0 ? 'pl-4' : 'pl-1'}`}
                style={{ maxHeight: "120px", minHeight: "24px" }}
              />
              <div className="flex items-center gap-1 flex-shrink-0 mb-1 mr-1">
                <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageSelect} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-black"
                  title="Attach Photo"
                >
                  <Camera size={18} strokeWidth={2.5} />
                </button>
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
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-black hover:bg-gray-800 text-[#c3f53c]"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </form>
        <p className="text-center text-xs mt-4 text-gray-400 font-medium">
          AI decisions are based on verified agricultural data. Always consult local experts for critical decisions.
        </p>
      </div>
    </div>
  </div>
</div>
  );
}
