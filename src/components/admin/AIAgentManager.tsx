import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  writeBatch
} from "firebase/firestore";
import {
  Sparkles,
  Brain,
  BookOpen,
  Bell,
  Sliders,
  Plus,
  Trash2,
  Pin,
  Search,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  ArrowRight,
  Edit3,
  Download,
  Upload,
  X,
  FileText,
  Check,
  ExternalLink,
  Eye,
  ChevronRight,
  Info
} from "lucide-react";

// Robust regex-based custom Markdown parser for code-blocks, headers, inline styles, and bullet points
const parseMarkdownToHtml = (text: string): string => {
  if (!text) return "";
  // Escape HTML to prevent injection
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Multi-line code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="bg-slate-900 text-indigo-300 p-4 rounded-xl font-mono text-xs overflow-x-auto my-3 border border-slate-800"><code>${code.trim()}</code></pre>`;
  });

  // Inline code (`code`)
  html = html.replace(/`(.*?)`/g, "<code class='bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-bold'>$1</code>");

  // Headers
  html = html.replace(/^### (.*?)$/gm, "<h4 class='text-slate-900 font-bold text-sm mt-4 mb-2'>$1</h4>");
  html = html.replace(/^## (.*?)$/gm, "<h3 class='text-slate-900 font-extrabold text-base mt-5 mb-2 border-b border-slate-100 pb-1'>$1</h3>");
  html = html.replace(/^# (.*?)$/gm, "<h2 class='text-slate-900 font-black text-lg mt-6 mb-3'>$1</h2>");

  // Bullet items
  html = html.replace(/^\s*-\s+(.*?)$/gm, "<li class='ml-4 list-disc text-slate-700 text-xs leading-relaxed my-1'>$1</li>");

  // Direct URLs to links
  html = html.replace(/(https?:\/\/[^\s]+)/g, "<a href='$1' target='_blank' rel='noreferrer' class='text-indigo-600 hover:underline font-bold inline-flex items-center gap-0.5'>$1 <span class='text-[9px]'>↗</span></a>");

  // Convert line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Memory {
  id: string;
  text: string;
  category: string;
  pinned: boolean;
  createdAt: string;
}

interface Knowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  content?: string;
  read: boolean;
  status: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  pinned: boolean;
  createdAt: string;
  scheduledAt: string | null;
  repeat: string;
  metadata?: any;
}

export const AIAgentManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "memory" | "knowledge" | "notifications" | "settings">("chat");

  // Chat States
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memory States
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemoryText, setNewMemoryText] = useState<string>("");
  const [newMemoryCat, setNewMemoryCat] = useState<string>("project");
  const [searchMemory, setSearchMemory] = useState<string>("");

  // Knowledge States
  const [knowledgeBase, setKnowledgeBase] = useState<Knowledge[]>([]);
  const [newKTitle, setNewKTitle] = useState<string>("");
  const [newKContent, setNewKContent] = useState<string>("");
  const [newKCat, setNewKCat] = useState<string>("seo_rules");
  const [searchKnowledge, setSearchKnowledge] = useState<string>("");
  const [selectedKnowledge, setSelectedKnowledge] = useState<Knowledge | null>(null);

  // System Settings States
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [personality, setPersonality] = useState<string>("");
  const [writingStyle, setWritingStyle] = useState<string>("");
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Notification States
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResultCount, setScanResultCount] = useState<number | null>(null);
  
  // Custom reminder creators
  const [newRemTitle, setNewRemTitle] = useState<string>("");
  const [newRemContent, setNewRemContent] = useState<string>("");
  const [newRemPriority, setNewRemPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [newRemDate, setNewRemDate] = useState<string>("");
  const [newRemRepeat, setNewRemRepeat] = useState<string>("none");
  const [isCreatingReminder, setIsCreatingReminder] = useState<boolean>(false);

  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // REAL-TIME FIRESTORE SUBSCRIPTIONS
  // ==========================================
  useEffect(() => {
    // 1. Subscribe to Chats
    const qChats = query(collection(db, "ai-agent-chats"), orderBy("updatedAt", "desc"));
    const unsubChats = onSnapshot(qChats, (snap) => {
      const chatList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setChats(chatList);
      if (chatList.length > 0 && !activeChatId) {
        setActiveChatId(chatList[0].id);
      }
    }, (err) => console.warn("Chats subscription info:", err));

    // 2. Subscribe to Memories
    const unsubMemories = onSnapshot(
      query(collection(db, "ai-agent-memories"), orderBy("createdAt", "desc")),
      (snap) => {
        setMemories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory)));
      },
      (err) => console.warn("Memories subscription info:", err)
    );

    // 3. Subscribe to Knowledge Items
    const unsubKnowledge = onSnapshot(
      query(collection(db, "ai-agent-knowledge"), orderBy("createdAt", "desc")),
      (snap) => {
        setKnowledgeBase(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Knowledge)));
      },
      (err) => console.warn("Knowledge subscription info:", err)
    );

    // 4. Subscribe to Admin Notifications
    const unsubNotifs = onSnapshot(
      query(collection(db, "notifications"), where("userId", "==", "admin")),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
        setNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      },
      (err) => console.warn("Notifications subscription info:", err)
    );

    // 5. Load AI Settings
    getDoc(doc(db, "settings", "ai-agent")).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCustomInstructions(data.customInstructions || "");
        setPersonality(data.personality || "");
        setWritingStyle(data.writingStyle || "");
      } else {
        // Fallbacks
        setCustomInstructions("You are professional, cooperative, and highly skilled in Lead Generation and Affiliate Marketing.");
        setPersonality("Supportive, strategic, and concise.");
        setWritingStyle("Clear, action-oriented, and optimized for SEO.");
      }
    });

    return () => {
      unsubChats();
      unsubMemories();
      unsubKnowledge();
      unsubNotifs();
    };
  }, []);

  // Fetch messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const unsubMessages = onSnapshot(
      query(collection(db, "ai-agent-chats", activeChatId, "messages"), orderBy("createdAt", "asc")),
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
      },
      (err) => console.warn("Chat messages subscription info:", err)
    );

    return () => unsubMessages();
  }, [activeChatId]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ==========================================
  // CHAT HANDLERS
  // ==========================================
  const handleCreateChat = async () => {
    const id = "chat_" + Date.now();
    await setDoc(doc(db, "ai-agent-chats", id), {
      id,
      title: `AI Assistant Session - ${new Date().toLocaleDateString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setActiveChatId(id);
  };

  const handleDeleteChat = async (chatId: string) => {
    if (confirm("Are you sure you want to clear this chat session?")) {
      await deleteDoc(doc(db, "ai-agent-chats", chatId));
      if (activeChatId === chatId) {
        setActiveChatId("");
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChatId) return;

    const userMsg = inputMessage.trim();
    setInputMessage("");
    setIsTyping(true);

    const userMsgId = "msg_" + Date.now();
    const userPayload: Message = {
      id: userMsgId,
      role: "user",
      content: userMsg,
      createdAt: new Date().toISOString(),
    };

    // 1. Add user message to active chat sub-collection
    await setDoc(doc(db, "ai-agent-chats", activeChatId, "messages", userMsgId), userPayload);
    await setDoc(doc(db, "ai-agent-chats", activeChatId), { updatedAt: new Date().toISOString() }, { merge: true });

    // 2. Prepare payload of full message history for backend
    // Fetch current chat messages to include in context
    const completeHistory = [...messages, userPayload].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        throw new Error(data.error || "Failed to parse AI response.");
      }
    } catch (err: any) {
      console.error(err);
      const errId = "msg_err_" + Date.now();
      await setDoc(doc(db, "ai-agent-chats", activeChatId, "messages", errId), {
        id: errId,
        role: "assistant",
        content: `❌ **Error communicating with AI:** ${err?.message || "Internal transmission failure. Please check your console."}`,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearAllChats = async () => {
    if (confirm("Warning: This will permanently delete all chat history records. Proceed?")) {
      const batch = writeBatch(db);
      chats.forEach((c) => {
        batch.delete(doc(db, "ai-agent-chats", c.id));
      });
      await batch.commit();
      setActiveChatId("");
    }
  };

  // ==========================================
  // MEMORY SYSTEM HANDLERS
  // ==========================================
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;

    const id = "mem_" + Date.now();
    await setDoc(doc(db, "ai-agent-memories", id), {
      id,
      text: newMemoryText.trim(),
      category: newMemoryCat,
      pinned: false,
      createdAt: new Date().toISOString(),
    });

    setNewMemoryText("");
  };

  const handleTogglePinMemory = async (memory: Memory) => {
    await setDoc(doc(db, "ai-agent-memories", memory.id), { pinned: !memory.pinned }, { merge: true });
  };

  const handleDeleteMemory = async (id: string) => {
    if (confirm("Delete this memory unit?")) {
      await deleteDoc(doc(db, "ai-agent-memories", id));
    }
  };

  // Export Memories
  const handleExportMemories = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ai-agent-memories-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Memories
  const handleImportMemoriesClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (Array.isArray(imported)) {
            const batch = writeBatch(db);
            imported.forEach((m: any) => {
              if (m.text) {
                const id = m.id || "mem_" + Math.random().toString(36).substr(2, 9);
                batch.set(doc(db, "ai-agent-memories", id), {
                  id,
                  text: m.text,
                  category: m.category || "general",
                  pinned: m.pinned || false,
                  createdAt: m.createdAt || new Date().toISOString(),
                });
              }
            });
            await batch.commit();
            alert(`Success! Imported ${imported.length} memories into persistent cache.`);
          } else {
            alert("Format invalid. Must be a valid JSON array of memories.");
          }
        } catch (err) {
          alert("Error parsing JSON file. Check structure integrity.");
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // KNOWLEDGE BASE HANDLERS
  // ==========================================
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKTitle.trim() || !newKContent.trim()) return;

    const id = "kb_" + Date.now();
    await setDoc(doc(db, "ai-agent-knowledge", id), {
      id,
      title: newKTitle.trim(),
      content: newKContent.trim(),
      category: newKCat,
      createdAt: new Date().toISOString(),
    });

    setNewKTitle("");
    setNewKContent("");
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (confirm("Delete this documentation block?")) {
      await deleteDoc(doc(db, "ai-agent-knowledge", id));
      if (selectedKnowledge?.id === id) {
        setSelectedKnowledge(null);
      }
    }
  };

  // Pre-seed premium Digital Marketer presets
  const handleLoadKnowledgePresets = async () => {
    const presets = [
      {
        title: "SEO Meta-title Formulas (2026)",
        category: "seo_rules",
        content: `1. Formula: [Casino Name] Review [Year] - Claim [Bonus Value]
Example: QQ777 Review 2026 - Claim 200% up to $1500
2. Formula: Is [Casino Name] Safe? - Registration Guide & Direct Payouts
Example: Is TK10 Safe? - Registration Guide & Direct Payouts

Rules: Keep Meta-titles under 65 characters to avoid desktop Google truncation.`
      },
      {
        title: "High-CTR Conversion Slogans",
        category: "business_rules",
        content: `Must pair a direct benefit with speed + security:
- 'Instant bKash Deposits, Guaranteed 10-Minute Cashouts'
- 'Claim 150 Free spins on Book of Dead + 100% Match Reward'
- 'Play Securely with No Wagering Constraints on Jackpot Wins'`
      },
      {
        title: "Firestore Schema & Collections",
        category: "firebase_structure",
        content: `- casinos: Houses directory details (slug, casinoName, affiliateLink, casinoLogo, status, welcomeBonus, shortDescription, landingContent, seoTitle, metaDescription)
- reviews: Houses player-submitted ratings and approval statuses (rating, comment, approved, casinoId, userName)
- sellRequests: Partnership acquisition bids (name, email, casinoName, amount, status)
- blogs: Dynamic blog posts (slug, title, excerpt, content, readTime)`
      }
    ];

    const batch = writeBatch(db);
    presets.forEach((p) => {
      const id = "kb_preset_" + Math.random().toString(36).substr(2, 9);
      batch.set(doc(db, "ai-agent-knowledge", id), {
        id,
        ...p,
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    alert("Preset knowledge documents registered successfully!");
  };

  // ==========================================
  // SYSTEM SETTINGS HANDLERS
  // ==========================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccess(false);

    try {
      await setDoc(doc(db, "settings", "ai-agent"), {
        customInstructions: customInstructions.trim(),
        personality: personality.trim(),
        writingStyle: writingStyle.trim(),
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to write settings. Confirm Firestore rule access.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ==========================================
  // NOTIFICATION & REMINDER HANDLERS
  // ==========================================
  const handleRunDiagnosticScan = async () => {
    setIsScanning(true);
    setScanResultCount(null);
    try {
      const response = await fetch("/api/ai-agent/scan", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setScanResultCount(data.count);
      } else {
        alert("Diagnostics scan failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting diagnostic server.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleTogglePinNotif = async (notif: Notification) => {
    await setDoc(doc(db, "notifications", notif.id), { pinned: !notif.pinned }, { merge: true });
  };

  const handleDeleteNotif = async (id: string) => {
    await deleteDoc(doc(db, "notifications", id));
  };

  const handleMarkNotifRead = async (id: string, read: boolean) => {
    await setDoc(doc(db, "notifications", id), { read, status: read ? "read" : "unread" }, { merge: true });
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim() || !newRemContent.trim()) return;

    setIsCreatingReminder(true);
    try {
      const id = "rem_" + Date.now();
      await setDoc(doc(db, "notifications", id), {
        id,
        userId: "admin",
        title: newRemTitle.trim(),
        message: newRemContent.trim(),
        content: newRemContent.trim(),
        read: false,
        status: "unread",
        type: "admin_task",
        priority: newRemPriority,
        pinned: false,
        createdAt: new Date().toISOString(),
        scheduledAt: newRemDate ? new Date(newRemDate).toISOString() : null,
        repeat: newRemRepeat,
      });

      setNewRemTitle("");
      setNewRemContent("");
      setNewRemDate("");
      setNewRemRepeat("none");
      alert("Smart scheduled reminder created and registered successfully!");
    } catch (err) {
      console.error(err);
      alert("Error writing reminder.");
    } finally {
      setIsCreatingReminder(false);
    }
  };

  // ==========================================
  // FILTERS
  // ==========================================
  const filteredMemories = memories.filter((m) => {
    const term = searchMemory.toLowerCase();
    return m.text.toLowerCase().includes(term) || m.category.toLowerCase().includes(term);
  });

  const filteredKnowledge = knowledgeBase.filter((k) => {
    const term = searchKnowledge.toLowerCase();
    return k.title.toLowerCase().includes(term) || k.content.toLowerCase().includes(term) || k.category.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto min-h-[700px] bg-slate-50 text-slate-800 antialiased">
      {/* Dynamic Sub-tab Selector */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-4 shrink-0">
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span>AI Agent Command Center</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Manage your personal lead-generation assistant, tune system memories, edit business knowledge, and check automated alerts.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "chat" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Assistant Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "memory" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Memory Engine</span>
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "knowledge" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Knowledge Base</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer relative ${
              activeTab === "notifications" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>AI Alerts</span>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-bold text-white ring-2 ring-white">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "settings" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* =======================================================
          TAB PANEL: CHAT
          ======================================================= */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-3xl overflow-hidden h-[620px] shadow-sm">
          {/* Chat Sessions Sidebar */}
          <div className="md:col-span-1 border-r border-slate-200 flex flex-col bg-slate-50 h-full">
            <div className="p-4 border-b border-slate-200 space-y-3 shrink-0">
              <button
                onClick={handleCreateChat}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Session</span>
              </button>
              <button
                onClick={handleClearAllChats}
                disabled={chats.length === 0}
                className="w-full py-1.5 px-3 border border-slate-250 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat History</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <span className="px-2 block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Active Sessions ({chats.length})
              </span>
              {chats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveChatId(c.id)}
                  className={`group w-full flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition ${
                    activeChatId === c.id
                      ? "bg-white border border-slate-250 text-indigo-700 shadow-xs font-bold"
                      : "hover:bg-slate-200/50 text-slate-600"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="text-[11px] truncate">{c.title}</span>
                    <span className="text-[8px] text-slate-400 font-semibold">
                      {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(c.id);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {chats.length === 0 && (
                <div className="p-6 text-center text-slate-400 space-y-2 mt-4">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-[11px] font-bold">No active sessions.</p>
                  <p className="text-[10px]">Click 'New Session' above to begin coaching.</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Chat Panel */}
          <div className="md:col-span-3 flex flex-col h-full bg-white">
            {activeChatId ? (
              <>
                {/* Messages Panel Scrollbox */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Assistant Intro Message */}
                  <div className="flex items-start gap-3 bg-linear-to-r from-indigo-50 to-cyan-50 border border-indigo-100/50 p-4 rounded-2xl animate-fade-in max-w-2xl">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-black text-slate-900 text-xs">
                        RefDirect Lead Strategist Assistant
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                        Hello! I am your personal lead-generation companion. I understand your Firebase structure, Cloudinary setups, writing rules, and are linked to active database scanner systems.
                      </p>
                      <div className="pt-2 text-[10px] text-indigo-600 font-bold flex flex-wrap gap-2">
                        <span>💡 Try saying:</span>
                        <button
                          onClick={() => setInputMessage("Search and list my casino drafts")}
                          className="bg-white px-2 py-0.5 rounded-md border border-indigo-200 hover:border-indigo-400 transition"
                        >
                          "Search and list my casino drafts"
                        </button>
                        <button
                          onClick={() => setInputMessage("Run database scanner scan")}
                          className="bg-white px-2 py-0.5 rounded-md border border-indigo-200 hover:border-indigo-400 transition"
                        >
                          "Run database scanner scan"
                        </button>
                      </div>
                    </div>
                  </div>

                  {messages.map((m) => {
                    const isAi = m.role === "assistant";
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start gap-3.5 max-w-3xl ${isAi ? "" : "ml-auto flex-row-reverse"}`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 shadow-xs ${
                            isAi ? "bg-indigo-600 text-white" : "bg-slate-900 text-amber-400"
                          }`}
                        >
                          {isAi ? <Sparkles className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className={`flex items-baseline gap-2 ${isAi ? "" : "justify-end"}`}>
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                              {isAi ? "AI Companion" : "Admin Panel Broker"}
                            </span>
                            <span className="text-[8px] text-slate-400 font-semibold">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`p-4 rounded-2xl text-xs leading-relaxed font-medium overflow-hidden border ${
                              isAi
                                ? "bg-slate-50 border-slate-150 text-slate-800"
                                : "bg-indigo-50/40 border-indigo-100 text-slate-900"
                            }`}
                            dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(m.content) }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex items-start gap-3.5 max-w-xl animate-pulse">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0">
                        <Sparkles className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                          AI Agent executing logic...
                        </span>
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" />
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce delay-100" />
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message input area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 shrink-0 bg-slate-50 flex gap-3 items-center">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your strategic query (e.g., 'Optimize SEO on high roller', or 'Scan my platform database')"
                    className="flex-1 px-4 py-3 border border-slate-250 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-white shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="p-3 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 rounded-2xl shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-4">
                <div className="p-5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-3xl shrink-0">
                  <Sparkles className="w-10 h-10 animate-bounce" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-display font-black text-slate-900 text-sm uppercase tracking-wider">
                    ব্রোকার চ্যাট চালু করুন
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    বামে থাকা 'New Session' বাটনে ক্লিক করে নতুন এআই চ্যাট সেশন শুরু করুন। এআই আপনার প্রজেক্টের রিয়েল-টাইম এনালাইসিস এবং ডাটাবেজ আপডেট করতে প্রস্তুত।
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================
          TAB PANEL: MEMORY
          ======================================================= */}
      {activeTab === "memory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create / Import Memory Controls */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  <span>Teach New Memory</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Persistent memories help the AI keep context of your personal preferences, business tags, or project structures.
                </p>
              </div>

              <form onSubmit={handleAddMemory} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Memory Instruction Text *
                  </label>
                  <textarea
                    value={newMemoryText}
                    onChange={(e) => setNewMemoryText(e.target.value)}
                    required
                    rows={4}
                    placeholder="e.g. 'Use bKash and Rocket payout speed values on Bangladeshi casino descriptions. Never write promotional speeds over 10 minutes.'"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category Tag
                  </label>
                  <select
                    value={newMemoryCat}
                    onChange={(e) => setNewMemoryCat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                  >
                    <option value="project">Project Details</option>
                    <option value="seo">SEO & Copywriting Rules</option>
                    <option value="firebase">Firebase & Rules</option>
                    <option value="cloudinary">Cloudinary Visuals</option>
                    <option value="style">Branding Style</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!newMemoryText.trim()}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Inject Memory</span>
                </button>
              </form>
            </div>

            {/* Import / Export Card */}
            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 text-white shadow-xs space-y-4">
              <div className="space-y-1">
                <h4 className="font-display font-black text-xs uppercase tracking-wider text-indigo-400">
                  Data Backup Gateway
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Export your active system memories as backup JSON files, or import previously saved configurations instantly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExportMemories}
                  className="py-2.5 px-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={handleImportMemoriesClick}
                  className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-200 animate-pulse" />
                  <span>Import JSON</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Memory Explorer list */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-slate-800 text-sm">
                  Memory Explorer ({filteredMemories.length})
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold">
                  Pinned memories are globally injected into all AI context calls. Unpinned memories are loaded dynamically.
                </p>
              </div>

              {/* Memory Search Bar */}
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchMemory}
                  onChange={(e) => setSearchMemory(e.target.value)}
                  placeholder="Search memory text..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {filteredMemories.map((m) => (
                <div
                  key={m.id}
                  className={`border p-4 rounded-2xl hover:border-slate-350 transition flex items-start justify-between gap-4 ${
                    m.pinned
                      ? "bg-indigo-50/30 border-indigo-200"
                      : "bg-slate-50/50 border-slate-200"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
                        {m.category}
                      </span>
                      <span className="text-[8px] text-slate-400 font-semibold">
                        Added {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                      {m.text}
                    </p>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePinMemory(m)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        m.pinned
                          ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500"
                          : "bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50"
                      }`}
                      title={m.pinned ? "Unpin memory" : "Pin memory"}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="p-1.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete memory unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredMemories.length === 0 && (
                <div className="p-12 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Brain className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold">No matching memory cells found.</p>
                  <p className="text-[10px]">Add a custom guideline using the left column.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB PANEL: KNOWLEDGE BASE
          ======================================================= */}
      {activeTab === "knowledge" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documentation list pane */}
          <div className="lg:col-span-1 space-y-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs h-[550px] flex flex-col">
            <div className="border-b border-slate-100 pb-3 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-slate-800 text-sm">
                  Document List ({filteredKnowledge.length})
                </h3>
                <button
                  onClick={handleLoadKnowledgePresets}
                  className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-[9px] font-black uppercase text-indigo-600 rounded-md transition cursor-pointer"
                >
                  Load presets
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchKnowledge}
                  onChange={(e) => setSearchKnowledge(e.target.value)}
                  placeholder="Filter documents..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {filteredKnowledge.map((k) => (
                <div
                  key={k.id}
                  onClick={() => setSelectedKnowledge(k)}
                  className={`p-3 rounded-xl cursor-pointer text-left transition border ${
                    selectedKnowledge?.id === k.id
                      ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                      : "hover:bg-slate-100 border-slate-150 text-slate-700 bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-sm ${
                      selectedKnowledge?.id === k.id
                        ? "bg-white/10 text-indigo-300"
                        : "bg-indigo-50 text-indigo-600 border border-indigo-100/30"
                    }`}>
                      {k.category.replace("_", " ")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteKnowledge(k.id);
                      }}
                      className={`p-1 rounded hover:bg-rose-100 hover:text-rose-600 transition ${
                        selectedKnowledge?.id === k.id ? "text-slate-400" : "text-slate-400"
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold truncate">{k.title}</h4>
                </div>
              ))}

              {filteredKnowledge.length === 0 && (
                <div className="p-8 text-center text-slate-400 space-y-2 mt-4">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-[11px] font-bold">Empty directory.</p>
                </div>
              )}
            </div>
          </div>

          {/* Document viewer / Creator pane */}
          <div className="lg:col-span-2 space-y-6">
            {selectedKnowledge ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 animate-fade-in min-h-[400px] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        {selectedKnowledge.category.replace("_", " ")}
                      </span>
                      <h3 className="font-display font-black text-slate-900 text-lg leading-tight mt-1">
                        {selectedKnowledge.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedKnowledge(null)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed font-semibold font-mono whitespace-pre-wrap bg-slate-50/50 p-4 rounded-2xl border border-slate-150">
                    {selectedKnowledge.content}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span>Document ID: <code className="bg-slate-100 px-1 rounded">{selectedKnowledge.id}</code></span>
                  <span>Created: {new Date(selectedKnowledge.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Plus className="h-5 w-5 text-indigo-600" />
                    <span>Upload Strategic Knowledge doc</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                    Upload copywriting rule books, bKash guidelines, tracking configurations, or API maps. The AI refers to this base documentation before writing metadata.
                  </p>
                </div>

                <form onSubmit={handleAddKnowledge} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Document Title *
                      </label>
                      <input
                        type="text"
                        value={newKTitle}
                        onChange={(e) => setNewKTitle(e.target.value)}
                        required
                        placeholder="e.g. Bangladeshi Player Payment Guidelines"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Category Folder
                      </label>
                      <select
                        value={newKCat}
                        onChange={(e) => setNewKCat(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                      >
                        <option value="seo_rules">SEO optimization Rules</option>
                        <option value="business_rules">Marketing Business Rules</option>
                        <option value="writing_style">Writing Tone Style</option>
                        <option value="firebase_structure">Firebase & Rules Data</option>
                        <option value="cloudinary_assets">Cloudinary asset mapping</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Documentation Text / Content *
                    </label>
                    <textarea
                      value={newKContent}
                      onChange={(e) => setNewKContent(e.target.value)}
                      required
                      rows={8}
                      placeholder="Insert guidelines, formatting lists, copy guidelines, or collection schema models..."
                      className="w-full px-3 py-3 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 resize-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newKTitle.trim() || !newKContent.trim()}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer ml-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save Document</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================
          TAB PANEL: NOTIFICATIONS
          ======================================================= */}
      {activeTab === "notifications" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Reminder Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Calendar className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <span>Create Scheduled Reminder</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Inject reminders directly into the Admin notification board. Set deadlines, alert channels, or recurrence loops.
                </p>
              </div>

              <form onSubmit={handleCreateReminder} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Reminder Title *
                  </label>
                  <input
                    type="text"
                    value={newRemTitle}
                    onChange={(e) => setNewRemTitle(e.target.value)}
                    required
                    placeholder="e.g. Audit Affiliate Redirect Tags"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Details / Content *
                  </label>
                  <textarea
                    value={newRemContent}
                    onChange={(e) => setNewRemContent(e.target.value)}
                    required
                    rows={3}
                    placeholder="Write detailed instructions..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Priority Level
                    </label>
                    <select
                      value={newRemPriority}
                      onChange={(e: any) => setNewRemPriority(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Scheduled Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newRemDate}
                      onChange={(e) => setNewRemDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Repeat Cycle
                  </label>
                  <select
                    value={newRemRepeat}
                    onChange={(e) => setNewRemRepeat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
                  >
                    <option value="none">One-time Alert</option>
                    <option value="daily">Daily Loop</option>
                    <option value="weekly">Weekly Loop</option>
                    <option value="monthly">Monthly Loop</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!newRemTitle.trim() || !newRemContent.trim() || isCreatingReminder}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isCreatingReminder ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Save Reminder</span>
                </button>
              </form>
            </div>
          </div>

          {/* Alerts & Notifications List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-slate-800 text-sm">
                  Active Admin Alerts ({notifications.filter((n) => !n.read).length} unread)
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold">
                  These notifications are generated automatically using database health scans and SEO diagnostic logic.
                </p>
              </div>

              <button
                onClick={handleRunDiagnosticScan}
                disabled={isScanning}
                className="self-start sm:self-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
                <span>Run Diagnostic Scan</span>
              </button>
            </div>

            {scanResultCount !== null && (
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-xs text-indigo-700 flex items-center gap-3 animate-fade-in shrink-0 font-semibold leading-relaxed">
                <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0" />
                <div>
                  Diagnostic Scan complete! Identified and generated{" "}
                  <strong className="text-indigo-900">{scanResultCount} new alert issues</strong> in the dashboard database.
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notifications.map((n) => {
                const isCritical = n.priority === "critical";
                const isHigh = n.priority === "high";
                const isMedium = n.priority === "medium";

                return (
                  <div
                    key={n.id}
                    className={`border p-4 rounded-2xl hover:border-slate-300 transition flex items-start gap-4 relative overflow-hidden ${
                      n.read ? "bg-slate-50/50 border-slate-200 opacity-75" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    {/* Left vertical color bar for priority */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        isCritical
                          ? "bg-rose-500 animate-pulse"
                          : isHigh
                          ? "bg-amber-500"
                          : isMedium
                          ? "bg-indigo-500"
                          : "bg-slate-400"
                      }`}
                    />

                    <div className="flex-1 space-y-1.5 ml-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[8px] uppercase font-black px-2 py-0.5 rounded-md ${
                            isCritical
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : isHigh
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}
                        >
                          {n.priority}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {n.type.replace("_", " ")}
                        </span>
                        {n.scheduledAt && (
                          <span className="text-[8px] text-pink-600 font-bold bg-pink-50 border border-pink-100 px-1.5 rounded flex items-center gap-0.5 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Remind: {new Date(n.scheduledAt).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {n.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        {n.message || n.content}
                      </p>

                      <div className="text-[9px] text-slate-400 font-medium flex items-center gap-2 pt-1.5">
                        <span>Triggered: {new Date(n.createdAt).toLocaleDateString()}</span>
                        {n.repeat !== "none" && (
                          <span className="font-mono text-pink-600">({n.repeat} cycle)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMarkNotifRead(n.id, !n.read)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          n.read
                            ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                        }`}
                        title={n.read ? "Mark unread" : "Mark read"}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNotif(n.id)}
                        className="p-1.5 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                        title="Dismiss alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {notifications.length === 0 && (
                <div className="p-16 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold">No active database alerts.</p>
                  <p className="text-[10px]">Click 'Run Diagnostic Scan' above to scan listings for missing fields.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          TAB PANEL: SETTINGS
          ======================================================= */}
      {activeTab === "settings" && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-display font-bold text-slate-800 text-base flex items-center gap-1.5">
              <Sliders className="h-5 w-5 text-indigo-600" />
              <span>System Instruction Editor</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
              Tweak the core personality, guidelines, and copywriting behaviors of your AI companion without editing any code.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {saveSuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-700 flex items-center gap-1.5 animate-fade-in font-semibold leading-relaxed">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <span>Agent Core parameters synchronized successfully! Changes apply to next message instantly.</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Custom Instructions / Core Directives *
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                required
                rows={5}
                placeholder="Give direct rules..."
                className="w-full px-3 py-3 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-indigo-500 bg-slate-50/30 resize-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                AI Personality & Persona Descriptor
              </label>
              <input
                type="text"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="e.g. Cooperative, highly professional digital marketer and brokerage advisor"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Writing Style & Copywriting Voice
              </label>
              <input
                type="text"
                value={writingStyle}
                onChange={(e) => setWritingStyle(e.target.value)}
                placeholder="e.g. Persuasive copywriter, structures data using bold formatting and scannable lists"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 bg-slate-50/30"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSavingSettings || !customInstructions.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingSettings ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Agent Behavior"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
