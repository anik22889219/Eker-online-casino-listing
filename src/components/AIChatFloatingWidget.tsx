import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import {
  Sparkles,
  MessageSquare,
  MessagesSquare,
  X,
  Send,
  Trash2,
  Maximize2,
  MinusCircle,
  Bot,
  User as UserIcon,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Headphones,
  Zap,
  GripVertical,
  Move
} from "lucide-react";
import { User } from "firebase/auth";

// @ts-ignore
import tigerMascot from "../assets/images/tiger_mascot_1783120916732.jpg";

interface AIChatFloatingWidgetProps {
  currentUser: User | null;
  isAdmin: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// Custom Markdown parser for quick response formatting
const parseMarkdownToHtml = (text: string): string => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Inline code (`code`)
  html = html.replace(/`(.*?)`/g, "<code class='bg-slate-100 text-pink-600 px-1 py-0.5 rounded font-mono text-[11px] font-bold'>$1</code>");

  // Multi-line code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="bg-slate-900 text-indigo-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto my-2 border border-slate-800"><code>${code.trim()}</code></pre>`;
  });

  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h4 class='text-slate-900 font-bold text-xs mt-3 mb-1'>$1</h4>");
  html = html.replace(/^## (.*?)$/gm, "<h3 class='text-slate-900 font-extrabold text-xs mt-3 mb-1 border-b border-slate-100 pb-1'>$1</h3>");

  // Bullet items
  html = html.replace(/^\s*-\s+(.*?)$/gm, "<li class='ml-3 list-disc text-slate-700 text-xs leading-relaxed my-0.5'>$1</li>");

  // Links
  html = html.replace(/(https?:\/\/[^\s]+)/g, "<a href='$1' target='_blank' rel='noreferrer' class='text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5'>$1 <span class='text-[9px]'>↗</span></a>");

  // Newlines
  html = html.replace(/\n/g, "<br />");

  return html;
};

export const AIChatFloatingWidget: React.FC<AIChatFloatingWidgetProps> = ({ currentUser, isAdmin }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);  // Drag and drop position state & refs
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_chatbot_pos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            return parsed;
          }
        } catch (e) {
          console.warn("Could not parse saved chatbot position:", e);
        }
      }
      return {
        x: Math.max(16, window.innerWidth - 72 - 16),
        y: Math.max(16, window.innerHeight - 72 - 160),
      };
    }
    return { x: 300, y: 500 };
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFlexible, setIsFlexible] = useState<boolean>(false);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);

  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to keep widget strictly bounded inside screen
  const getClampedPosition = (x: number, y: number, openState: boolean) => {
    if (typeof window === "undefined") return { x, y };
    const width = openState ? (window.innerWidth < 640 ? Math.min(window.innerWidth - 32, 410) : 410) : 72;
    const height = openState ? Math.min(window.innerHeight - 32, 580) : 72;
    const padding = 16;

    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const maxY = Math.max(padding, window.innerHeight - height - padding);

    return {
      x: Math.max(padding, Math.min(maxX, x)),
      y: Math.max(padding, Math.min(maxY, y)),
    };
  };

  // Magnetic edge snap helper for collapsed launcher icon
  const snapToEdge = (currentX: number, currentY: number) => {
    if (typeof window === "undefined") return { x: currentX, y: currentY };

    const widgetWidth = 72;
    const widgetHeight = 72;
    const padding = 16;

    const centerX = currentX + widgetWidth / 2;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Determine nearest edge (Left or Right)
    const targetX = centerX < screenWidth / 2
      ? padding
      : Math.max(padding, screenWidth - widgetWidth - padding);

    // Keep Y clamped inside viewport
    const targetY = Math.max(padding, Math.min(screenHeight - widgetHeight - padding, currentY));

    return { x: targetX, y: targetY };
  };

  // Re-clamp position whenever window size changes or when opened/closed
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) {
      // Smoothly snap to edge on closing
      setIsSnapping(true);
      setPosition((prev) => {
        const snapped = snapToEdge(prev.x, prev.y);
        localStorage.setItem("admin_chatbot_pos", JSON.stringify(snapped));
        return snapped;
      });
      const timer = setTimeout(() => setIsSnapping(false), 300);
      return () => clearTimeout(timer);
    } else {
      setPosition((prev) => getClampedPosition(prev.x, prev.y, true));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (isOpen) {
          return getClampedPosition(prev.x, prev.y, true);
        } else {
          return snapToEdge(prev.x, prev.y);
        }
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Pointer event handlers for long-press & drag & drop
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (
      (target.closest("button") && !target.closest(".drag-handle-btn") && !target.closest(".chatbot-launcher-btn")) ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea")
    ) {
      return;
    }

    hasDraggedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    // Long press detection for mobile & desktop (~280ms)
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setIsFlexible(true);
      setIsDragging(true);
      hasDraggedRef.current = true;

      // Mobile haptic vibration feedback
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch (_) {}
      }
    }, 280);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn("setPointerCapture info:", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const distance = Math.hypot(dx, dy);

    // If moved more than 6px, user is initiating drag
    if (distance > 6) {
      hasDraggedRef.current = true;

      // Activate flexible drag mode immediately on movement
      if (!isFlexible) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        setIsFlexible(true);
        setIsDragging(true);
      }
    }

    if (isDragging || distance > 6) {
      const rawX = dragStartRef.current.posX + dx;
      const rawY = dragStartRef.current.posY + dy;

      const clamped = getClampedPosition(rawX, rawY, isOpen);
      setPosition(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // Ignored if pointer capture already released
    }

    const wasMoved = hasDraggedRef.current || isDragging || isFlexible;

    if (wasMoved && !isOpen) {
      // Magnetically snap to nearest screen edge
      setIsSnapping(true);
      const snapped = snapToEdge(position.x, position.y);
      setPosition(snapped);
      localStorage.setItem("admin_chatbot_pos", JSON.stringify(snapped));

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch (_) {}
      }

      setTimeout(() => {
        setIsSnapping(false);
      }, 300);
    }

    setIsDragging(false);
    setIsFlexible(false);
    dragStartRef.current = null;
  };

  const handleLauncherClick = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    setIsOpen(true);
  };

  // 1. Unread notifications counter
  useEffect(() => {
    if (!isAdmin) return;
    const qNotifs = query(collection(db, "notifications"), where("userId", "==", "admin"), where("read", "==", false));
    const unsub = onSnapshot(qNotifs, (snap) => {
      setUnreadAlertsCount(snap.size);
    }, (err) => console.warn("Notifications subscription info:", err));
    return () => unsub();
  }, [isAdmin]);

  // 2. Initialize or fetch active floating chat session
  useEffect(() => {
    if (!isOpen) return;

    const initChat = async () => {
      if (activeChatId) return;

      // Look for an existing chat session or create one
      const floatChatId = "chat_floating_" + (currentUser?.uid || "admin");
      const chatDocRef = doc(db, "ai-agent-chats", floatChatId);
      const snap = await getDoc(chatDocRef);

      if (!snap.exists()) {
        await setDoc(chatDocRef, {
          id: floatChatId,
          title: "Floating Assistant Widget",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setActiveChatId(floatChatId);
    };

    initChat();
  }, [isOpen, currentUser, activeChatId]);

  // 3. Listen to messages for the activeChatId
  useEffect(() => {
    if (!activeChatId) return;

    const qMsgs = query(
      collection(db, "ai-agent-chats", activeChatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(qMsgs, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    }, (err) => console.warn("Messages subscription info:", err));

    return () => unsub();
  }, [activeChatId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage.trim();
    if (!textToSend || !activeChatId) return;

    setInputMessage("");
    setIsTyping(true);

    const userMsgId = "msg_" + Date.now();
    const userPayload: Message = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    // Save user message to Firestore
    await setDoc(doc(db, "ai-agent-chats", activeChatId, "messages", userMsgId), userPayload);
    await setDoc(doc(db, "ai-agent-chats", activeChatId), { updatedAt: new Date().toISOString() }, { merge: true });

    // Prepare history for AI route
    const completeHistory = [...messages, userPayload].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: completeHistory }),
      });

      const data = await response.json();
      if (data.success && data.text) {
        const assistantMsgId = "msg_ai_" + Date.now();
        await setDoc(doc(db, "ai-agent-chats", activeChatId, "messages", assistantMsgId), {
          id: assistantMsgId,
          role: "assistant",
          content: data.text,
          createdAt: new Date().toISOString(),
        });
      } else {
        throw new Error(data.error || "Failed to process AI chat response.");
      }
    } catch (err: any) {
      console.error(err);
      const errId = "msg_err_" + Date.now();
      await setDoc(doc(db, "ai-agent-chats", activeChatId, "messages", errId), {
        id: errId,
        role: "assistant",
        content: `❌ **Error:** ${err?.message || "Transmission failed. Check internet or API key configuration."}`,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = async () => {
    if (!activeChatId) return;
    if (confirm("Clear chatbot conversation history?")) {
      const batch = writeBatch(db);
      messages.forEach((m) => {
        batch.delete(doc(db, "ai-agent-chats", activeChatId, "messages", m.id));
      });
      await batch.commit();
    }
  };

  // Security Guard: Only render chatbot widget if logged in as Admin
  if (!currentUser || !isAdmin) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        touchAction: "none",
      }}
      className={`font-sans antialiased pointer-events-none select-none ${
        isSnapping ? "transition-all duration-300 ease-out" : "transition-none"
      }`}
    >
      {/* 1. FLOATING CHATBOX CONTAINER */}
      {isOpen ? (
        <div className="pointer-events-auto w-[calc(100vw-2rem)] sm:w-[410px] h-[520px] max-h-[70vh] sm:max-h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header & Drag Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            title="Drag header to move chatbot anywhere on screen"
          >
            <div className="flex items-center gap-2">
              <div
                className="drag-handle-btn p-1 text-slate-400 hover:text-indigo-300 rounded-lg transition"
                title="Hold & drag to move"
              >
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-amber-500/80 shadow-xs shrink-0 bg-slate-800">
                <img src={tigerMascot} alt="Tiger AI Assistant" className="w-full h-full object-cover object-center" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-black text-xs text-white flex items-center gap-1.5">
                  RefDirect AI Assistant
                  <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 text-[9px] font-bold rounded-full uppercase tracking-wider">
                    v2.5
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <span>Drag header to re-position</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link
                  to="/admin?tab=ai-agent"
                  title="Open Full AI Agent Manager"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50/50">
            {/* Welcome intro */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/80 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>How can I assist you today?</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                I can scan listing SEO, check database stats, auto-generate descriptions, or create custom reminders.
              </p>

              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => handleSendMessage(undefined, "Show overall database statistics")}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  📊 Show stats
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, "Run a full database scan for SEO & quality issues")}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  🔍 Scan SEO issues
                </button>
                <button
                  onClick={() => handleSendMessage(undefined, "Search and list casino drafts")}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold rounded-lg shadow-2xs transition cursor-pointer"
                >
                  🎰 List drafts
                </button>
              </div>
            </div>

            {/* Rendered Messages */}
            {messages.map((m) => {
              const isAi = m.role === "assistant";
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 max-w-[90%] ${isAi ? "" : "ml-auto flex-row-reverse"}`}
                >
                  <div
                    className={`shrink-0 overflow-hidden shadow-2xs ${
                      isAi
                        ? "w-7 h-7 rounded-full border border-amber-500/60 bg-slate-900"
                        : "p-1.5 rounded-xl bg-slate-900 text-white"
                    }`}
                  >
                    {isAi ? (
                      <img src={tigerMascot} alt="AI" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed font-medium overflow-hidden border ${
                        isAi
                          ? "bg-white border-slate-200/80 text-slate-800 shadow-2xs"
                          : "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                      }`}
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(m.content) }}
                    />
                    <span className="text-[8px] text-slate-400 font-semibold px-1 block">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing status */}
            {isTyping && (
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold p-2 bg-indigo-50/60 rounded-xl border border-indigo-100 max-w-xs animate-pulse">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>AI Agent processing request...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Form */}
          <form
            onSubmit={(e) => handleSendMessage(e)}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask AI anything..."
              className="flex-1 px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : (
        /* 2. FLOATING LAUNCHER BUTTON (Clean Mascot Image Only) */
        <div className="relative pointer-events-auto">
          {/* Active Dragging Tooltip Badge */}
          {(isFlexible || isDragging) && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg border border-amber-400/50 animate-bounce pointer-events-none flex items-center gap-1 z-10">
              <Move className="w-3 h-3 animate-pulse" />
              <span>Drag to move</span>
            </div>
          )}

          <button
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={handleLauncherClick}
            className={`chatbot-launcher-btn group relative w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-amber-500/90 shadow-2xl transition-transform duration-200 select-none cursor-grab bg-slate-900 focus:outline-hidden ${
              isDragging || isFlexible
                ? "cursor-grabbing scale-110 ring-4 ring-amber-500/80 shadow-amber-500/40"
                : "hover:scale-105 active:scale-95 ring-3 ring-amber-500/40 hover:ring-amber-500/90"
            }`}
            title="Tap to chat or press & drag to move"
            aria-label="AI Agent Assistant"
          >
            <img
              src={tigerMascot}
              alt="AI Assistant"
              className="w-full h-full object-cover object-center pointer-events-none"
            />

            {/* Online indicator dot */}
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-pulse pointer-events-none" />

            {/* Alert badge if any */}
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-black text-white ring-2 ring-slate-900 shadow-md">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AIChatFloatingWidget;
