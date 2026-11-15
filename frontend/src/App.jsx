import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  Files,
  MessageSquare,
  CalendarDays,
  Settings,
  Search,
  Bell,
  Upload,
  FileText,
  File,
  ArrowUpRight,
  Sparkles,
  Plus,
  Menu,
  X,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Database,
  Hash,
  RefreshCw,
  ChevronRight,
  MessageCircle,
  PlusCircle,
  Layers,
} from "lucide-react";
import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  getStats,
} from "./services/documentService";
import {
  sendChatMessage,
  getConversationHistory,
  clearConversationHistory,
} from "./services/chatService";

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle size={18} className="text-green-600 shrink-0" />,
          error: <AlertCircle size={18} className="text-red-600 shrink-0" />,
          info: <Info size={18} className="text-blue-600 shrink-0" />,
        };
        const styles = {
          success: "border-green-200 bg-green-50 text-green-800",
          error: "border-red-200 bg-red-50 text-red-800",
          info: "border-blue-200 bg-blue-50 text-blue-800",
        };
        return (
          <div
            key={toast.id}
            className={`flex max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg transition-all ${styles[toast.type]}`}
          >
            {icons[toast.type]}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, toast: addToast, dismiss };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, loading, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon size={20} className="text-blue-600" />
      </div>
      {loading ? (
        <div className="mt-5 h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
      ) : (
        <h3 className="mt-5 text-3xl font-bold">{value ?? "—"}</h3>
      )}
      <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 p-4">
      <div className="h-10 w-10 rounded-lg bg-slate-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 rounded bg-slate-200" />
        <div className="h-3 w-32 rounded bg-slate-200" />
      </div>
      <div className="h-6 w-16 rounded-full bg-slate-200" />
    </div>
  );
}

// ─── Conversation Session Helpers ─────────────────────────────────────────────

const SESSIONS_KEY = "palm_mind_sessions";

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function newSession() {
  return {
    id: crypto.randomUUID(),
    label: `Session ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    createdAt: new Date().toISOString(),
  };
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Documents", icon: Files },
  { name: "AI Assistant", icon: MessageSquare },
  { name: "Bookings", icon: CalendarDays },
];

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const { toasts, toast, dismiss } = useToast();

  // Navigation
  const [activePage, setActivePage] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);

  // Upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [chunkStrategy, setChunkStrategy] = useState("recursive");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  // Documents
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentDetailsLoading, setDocumentDetailsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Chat / Conversations
  const [sessions, setSessions] = useState(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = loadSessions();
    if (saved.length > 0) return saved[0].id;
    const s = newSession();
    saveSessions([s]);
    return s.id;
  });
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [selectedChatDocument, setSelectedChatDocument] = useState("all");
  const [showSessionPanel, setShowSessionPanel] = useState(false);

  const searchInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getStats();
      setStats(data);
    } catch {
      // stats are non-critical; fail silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true);
      setDocumentsError("");
      const data = await getDocuments();
      setDocuments(data);
    } catch (error) {
      setDocumentsError(
        error.response?.data?.detail || error.message || "Failed to load documents."
      );
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, [loadDocuments, loadStats]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Load history when session changes
  useEffect(() => {
    if (!activeSessionId) return;
    getConversationHistory(activeSessionId)
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]));
  }, [activeSessionId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleViewDocument = async (documentId) => {
    try {
      setDocumentDetailsLoading(true);
      const data = await getDocument(documentId);
      setSelectedDocument(data);
    } catch {
      toast("Failed to load document details.", "error");
    } finally {
      setDocumentDetailsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId, filename) => {
    const confirmed = window.confirm(`Delete "${filename}"? This also removes all associated vectors from Qdrant.`);
    if (!confirmed) return;

    try {
      setDeletingDocumentId(documentId);
      await deleteDocument(documentId);
      await Promise.all([loadDocuments(), loadStats()]);
      if (selectedDocument?.document_id === documentId) setSelectedDocument(null);

      toast(`"${filename}" deleted successfully.`, "success");
      setNotifications((prev) => [
        { id: Date.now(), text: `Deleted "${filename}"`, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
    } catch (error) {
      toast(error.response?.data?.detail || "Failed to delete document.", "error");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a document first.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadResult(null);

    try {
      const result = await uploadDocument(selectedFile, chunkStrategy);
      setUploadResult(result);
      setSelectedFile(null);
      await Promise.all([loadDocuments(), loadStats()]);
      toast(`"${result.filename}" uploaded — ${result.chunk_count} chunks indexed.`, "success");
      setNotifications((prev) => [
        { id: Date.now(), text: `Uploaded "${result.filename}"`, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ]);
    } catch (error) {
      const msg = error.response?.data?.detail || error.message || "Unknown upload error";
      setUploadError(msg);
      toast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
      setUploadResult(null);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const userQuestion = question.trim();
    if (!userQuestion || chatLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: userQuestion }]);
    setQuestion("");
    setChatLoading(true);
    setChatError("");

    try {
      const result = await sendChatMessage({
        question: userQuestion,
        conversationId: activeSessionId,
        documentId: selectedChatDocument === "all" ? null : selectedChatDocument,
        limit: 5,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          retrievedCount: result.retrieved_count,
        },
      ]);
    } catch (error) {
      setChatError(
        error.response?.data?.detail || error.message || "Failed to get an answer. Please try again."
      );
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewSession = () => {
    const s = newSession();
    const updated = [s, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    setActiveSessionId(s.id);
    setMessages([]);
    setShowSessionPanel(false);
  };

  const handleSelectSession = (session) => {
    setActiveSessionId(session.id);
    setShowSessionPanel(false);
  };

  const handleClearSession = async (sessionId) => {
    try {
      await clearConversationHistory(sessionId);
      if (sessionId === activeSessionId) setMessages([]);
      toast("Conversation cleared.", "info");
    } catch {
      toast("Failed to clear conversation.", "error");
    }
  };

  const handleDeleteSession = (sessionId) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    saveSessions(updated);
    if (sessionId === activeSessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        const s = newSession();
        saveSessions([s]);
        setSessions([s]);
        setActiveSessionId(s.id);
        setMessages([]);
      }
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex min-h-screen">
        {/* ── Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 text-white transition-transform lg:static lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
                <Sparkles size={22} />
              </div>
              <div>
                <h1 className="font-bold tracking-wide">DocuMind</h1>
                <p className="text-xs text-slate-400">AI Workspace</p>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setMobileMenu(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-7">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Workspace
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = activePage === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActivePage(item.name);
                      setMobileMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon size={19} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar stats mini */}
          {stats && (
            <div className="mx-4 mb-4 rounded-xl bg-slate-900 p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Files size={12} /> Documents</span>
                <span className="font-bold text-white">{stats.total_documents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Database size={12} /> Vectors</span>
                <span className="font-bold text-white">{stats.total_vectors?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><CalendarDays size={12} /> Bookings</span>
                <span className="font-bold text-white">{stats.active_bookings}</span>
              </div>
            </div>
          )}

          <div className="mt-auto border-t border-slate-800 p-5">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
              <Settings size={19} />
              Settings
            </button>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 font-bold">
                U
              </div>
              <div>
                <p className="text-sm font-medium">Workspace User</p>
                <p className="text-xs text-slate-500">Personal workspace</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenu && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}

        {/* ── Main ── */}
        <main className="min-w-0 flex-1">
          {/* Header */}
          <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button className="lg:hidden" onClick={() => setMobileMenu(true)}>
                <Menu size={22} />
              </button>
              <div>
                <p className="text-sm text-slate-500">Workspace</p>
                <h2 className="text-lg font-bold">{activePage}</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActivePage("Documents");
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="hidden rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 sm:block"
                title="Search documents"
              >
                <Search size={19} />
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                >
                  <Bell size={19} />
                  {notifications.length > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-14 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">Notifications</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3">
                      {notifications.length === 0 ? (
                        <>
                          <p className="text-sm text-slate-600">You're all caught up!</p>
                          <p className="text-xs text-slate-400">New notifications will appear here.</p>
                        </>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="flex items-start gap-2">
                            <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-500" />
                            <div>
                              <p className="text-sm text-slate-700">{n.text}</p>
                              <p className="text-xs text-slate-400">{n.time}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">

            {/* ── Overview ── */}
            {activePage === "Overview" && (
              <>
                <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Welcome to DocuMind</h2>
                    <p className="mt-2 text-sm text-slate-500">Manage your documents and get intelligent answers.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { loadDocuments(); loadStats(); }}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
                      title="Refresh"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                    <button
                      onClick={() => setActivePage("Documents")}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                      <Plus size={18} />
                      Add Document
                    </button>
                  </div>
                </section>

                {/* Stats grid */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Total Documents"
                    value={stats?.total_documents}
                    icon={Files}
                    loading={statsLoading}
                    subtitle={statsLoading ? "Loading..." : "Uploaded to knowledge base"}
                  />
                  <StatCard
                    label="Knowledge Chunks"
                    value={stats?.total_chunks?.toLocaleString()}
                    icon={Layers}
                    loading={statsLoading}
                    subtitle="Text segments indexed"
                  />
                  <StatCard
                    label="Qdrant Vectors"
                    value={stats?.total_vectors?.toLocaleString()}
                    icon={Database}
                    loading={statsLoading}
                    subtitle="Embeddings stored in Qdrant"
                  />
                  <StatCard
                    label="Active Bookings"
                    value={stats?.active_bookings}
                    icon={CalendarDays}
                    loading={statsLoading}
                    subtitle="Confirmed interview bookings"
                  />
                </section>

                {/* Upload + Assistant */}
                <section className="grid gap-6 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <div className="mb-5">
                      <h3 className="text-lg font-bold">Upload documents</h3>
                      <p className="mt-1 text-sm text-slate-500">Add documents to your AI knowledge base.</p>
                    </div>
                    <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
                      <div className="mb-4 rounded-full bg-blue-100 p-4 text-blue-600">
                        <Upload size={26} />
                      </div>
                      <p className="font-semibold">Click to browse files</p>
                      <p className="mt-2 text-sm text-slate-500">Upload PDF or TXT documents</p>
                      <p className="mt-3 text-xs text-slate-400">Supported formats: PDF, TXT</p>
                      <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileChange} />
                    </label>
                    {selectedFile && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 p-4">
                        <FileText className="text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB · Selected</p>
                        </div>
                        <button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {uploading ? "Uploading..." : "Upload"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
                    <div>
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="text-xl font-bold">Ask your documents</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        Use AI-powered retrieval to find relevant information from your uploaded documents.
                      </p>
                    </div>
                    <button
                      onClick={() => setActivePage("AI Assistant")}
                      className="mt-8 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-50"
                    >
                      Open AI Assistant
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </section>

                {/* Recent documents */}
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Recent documents</h3>
                      <p className="mt-1 text-sm text-slate-500">Your 5 most recently uploaded files.</p>
                    </div>
                    <button
                      onClick={() => setActivePage("Documents")}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {statsLoading ? (
                      Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : (stats?.recent_documents?.length ?? 0) === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <File size={32} className="text-slate-300" />
                        <p className="mt-3 text-sm font-medium text-slate-600">No documents yet</p>
                        <p className="mt-1 text-xs text-slate-400">Upload your first document to get started.</p>
                      </div>
                    ) : (
                      stats.recent_documents.map((doc) => (
                        <div
                          key={doc.document_id}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                        >
                          <div className="rounded-lg bg-blue-50 p-2.5">
                            <FileText className="text-blue-600" size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{doc.filename}</p>
                            <p className="text-xs text-slate-400">
                              {doc.chunk_count} chunks · {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            {doc.status}
                          </span>
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}

            {/* ── Documents ── */}
            {activePage === "Documents" && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Document Library</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Upload and manage the documents used by your AI knowledge base.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    {/* Upload card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="font-bold">Upload a document</h3>
                      <p className="mt-1 text-sm text-slate-500">Select a PDF or TXT file to add to your knowledge base.</p>

                      <label className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-blue-400 hover:bg-blue-50">
                        <Upload size={30} className="mb-4 text-blue-600" />
                        <p className="font-semibold">Choose a document</p>
                        <p className="mt-2 text-sm text-slate-500">PDF and TXT files supported</p>
                        <input type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileChange} />
                      </label>

                      {selectedFile && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <FileText className="shrink-0 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button onClick={() => setSelectedFile(null)} className="text-sm text-red-600 hover:text-red-700">
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chunk strategy */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="font-bold">Processing configuration</h3>
                      <p className="mt-1 text-sm text-slate-500">Choose how the document text should be divided into chunks.</p>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {[
                          {
                            id: "recursive",
                            icon: FileText,
                            title: "Recursive chunking",
                            desc: "Splits text using hierarchical separators while trying to preserve meaningful sections.",
                          },
                          {
                            id: "token",
                            icon: Hash,
                            title: "Token-based chunking",
                            desc: "Divides text according to token limits for more predictable chunk sizes.",
                          },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setChunkStrategy(s.id)}
                            className={`rounded-xl border p-5 text-left transition ${
                              chunkStrategy === s.id
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <s.icon className="text-blue-600" />
                              <span
                                className={`h-4 w-4 rounded-full border-2 ${
                                  chunkStrategy === s.id ? "border-blue-600 bg-blue-600" : "border-slate-300"
                                }`}
                              />
                            </div>
                            <h4 className="mt-4 font-semibold">{s.title}</h4>
                            <p className="mt-2 text-sm leading-6 text-slate-500">{s.desc}</p>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        <p><strong>Selected:</strong> {chunkStrategy === "recursive" ? "Recursive" : "Token-based"}</p>
                        <p className="mt-1 text-xs text-slate-500">Default chunk size: 500 tokens · overlap: 50</p>
                      </div>

                      <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploading ? "Processing document..." : "Upload document"}
                      </button>

                      {uploading && (
                        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                          Extracting text, generating embeddings, storing vectors…
                        </div>
                      )}

                      {uploadError && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          {uploadError}
                        </div>
                      )}

                      {uploadResult && (
                        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
                          <h4 className="font-semibold text-green-800">Document uploaded successfully!</h4>
                          <p className="mt-2 text-sm text-green-700">{uploadResult.message}</p>
                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            {[
                              ["Chunks", uploadResult.chunk_count],
                              ["Embeddings", uploadResult.embedding_count],
                              ["Dimensions", uploadResult.embedding_dimensions],
                              ["Characters", uploadResult.character_count],
                              ["Stored vectors", uploadResult.stored_vectors],
                              ["Strategy", uploadResult.chunking_strategy],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-lg bg-white p-3">
                                <p className="text-xs text-slate-500">{label}</p>
                                <p className="mt-1 break-words font-bold text-slate-900">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="font-bold">Processing pipeline</h3>
                      <div className="mt-5 space-y-5">
                        {["Document upload", "Text extraction", "Text chunking", "Embedding generation", "Qdrant storage", "Metadata persistence"].map((step, i) => (
                          <div key={step} className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                              {i + 1}
                            </div>
                            <p className="text-sm font-medium text-slate-700">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-6 text-white">
                      <Sparkles className="text-blue-400" size={25} />
                      <h3 className="mt-4 font-bold">Knowledge base</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Uploaded documents become searchable knowledge through embeddings and semantic retrieval.
                      </p>
                      {stats && !statsLoading && (
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-slate-800 p-3 text-center">
                            <p className="text-xl font-bold text-white">{stats.total_documents}</p>
                            <p className="text-xs text-slate-400">documents</p>
                          </div>
                          <div className="rounded-lg bg-slate-800 p-3 text-center">
                            <p className="text-xl font-bold text-white">{stats.total_chunks?.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">chunks</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents list */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Uploaded Documents</h3>
                      <p className="mt-1 text-sm text-slate-500">Documents stored in your knowledge base.</p>
                    </div>
                    <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
                      {documents.length} Documents
                    </span>
                  </div>

                  <div className="mt-6">
                    <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <Search size={18} className="text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search documents by filename..."
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      {documentsLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
                      ) : documentsError ? (
                        <p className="py-6 text-center text-sm text-red-600">{documentsError}</p>
                      ) : documents.filter((d) => d.filename.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500">
                          {documents.length === 0 ? "No documents uploaded yet." : "No matching documents found."}
                        </p>
                      ) : (
                        documents
                          .filter((d) => d.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((doc) => (
                            <div
                              key={doc.document_id}
                              className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-3">
                                  <FileText className="text-blue-600" size={22} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-800">{doc.filename}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {doc.created_at ? new Date(doc.created_at).toLocaleString() : "Date unavailable"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="text-slate-500 text-xs">{doc.chunk_count} chunks</span>
                                <span className="text-slate-500 text-xs">{doc.embedding_dimensions}d</span>
                                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                  {doc.status}
                                </span>
                                <button
                                  onClick={() => handleViewDocument(doc.document_id)}
                                  className="flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                >
                                  <Eye size={12} /> View
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(doc.document_id, doc.filename)}
                                  disabled={deletingDocumentId === doc.document_id}
                                  className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 size={12} />
                                  {deletingDocumentId === doc.document_id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Details panel */}
                {documentDetailsLoading && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-700">
                    Loading document details…
                  </div>
                )}

                {selectedDocument && !documentDetailsLoading && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">Document Details</h3>
                        <p className="mt-1 text-sm text-slate-500">Metadata retrieved from your backend.</p>
                      </div>
                      <button
                        onClick={() => setSelectedDocument(null)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>

                    <h4 className="mt-6 break-all text-base font-semibold">{selectedDocument.filename}</h4>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ["Document ID", selectedDocument.document_id],
                        ["Chunking Strategy", selectedDocument.chunking_strategy],
                        ["Character Count", selectedDocument.character_count],
                        ["Chunk Count", selectedDocument.chunk_count],
                        ["Embedding Dimensions", selectedDocument.embedding_dimensions],
                        ["Status", selectedDocument.status],
                        ["Created At", selectedDocument.created_at ? new Date(selectedDocument.created_at).toLocaleString() : "Unavailable"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">{label}</p>
                          <p className="mt-2 break-all text-sm font-semibold text-slate-800">{value ?? "Unavailable"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── AI Assistant ── */}
            {activePage === "AI Assistant" && (
              <section className="flex h-[calc(100vh-180px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Chat Header */}
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-50 p-3">
                        <Sparkles className="text-blue-600" size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">DocuMind AI Assistant</h3>
                        <p className="text-xs text-slate-500">
                          {activeSession?.label ?? "Session"} · {messages.length} messages
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSessionPanel(!showSessionPanel)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Clock size={13} /> Sessions
                      </button>
                      <button
                        onClick={handleNewSession}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <PlusCircle size={13} /> New
                      </button>
                    </div>
                  </div>

                  {/* Session panel */}
                  {showSessionPanel && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-48 overflow-y-auto space-y-1">
                      {sessions.length === 0 ? (
                        <p className="text-xs text-slate-400 p-2">No sessions yet.</p>
                      ) : (
                        sessions.map((s) => (
                          <div
                            key={s.id}
                            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 cursor-pointer ${
                              s.id === activeSessionId ? "bg-blue-100 text-blue-700" : "hover:bg-white"
                            }`}
                            onClick={() => handleSelectSession(s)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium">{s.label}</p>
                              <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleClearSession(s.id); }}
                                className="rounded p-1 text-slate-400 hover:text-orange-600"
                                title="Clear history"
                              >
                                <RefreshCw size={11} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                                className="rounded p-1 text-slate-400 hover:text-red-600"
                                title="Delete session"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Document selector */}
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-600">Search in</label>
                    <select
                      value={selectedChatDocument}
                      onChange={(e) => setSelectedChatDocument(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="all">All documents</option>
                      {documents.map((doc) => (
                        <option key={doc.document_id} value={doc.document_id}>
                          {doc.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <MessageCircle size={38} className="text-blue-300" />
                      <h3 className="mt-4 text-lg font-bold text-slate-800">Ask your documents anything</h3>
                      <p className="mt-2 max-w-md text-sm text-slate-500">
                        DocuMind retrieves relevant information from your uploaded documents and generates answers using AI.
                      </p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 ${
                          message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>

                        {message.role === "assistant" && message.sources?.length > 0 && (
                          <div className="mt-4 border-t border-slate-300 pt-3">
                            <p className="mb-2 text-xs font-bold">Sources ({message.retrievedCount})</p>
                            {message.sources.map((source, si) => (
                              <div key={si} className="mb-2 text-xs text-slate-600">
                                <p className="font-semibold">{source.filename}</p>
                                <p>
                                  Chunk: {source.chunk_index ?? "N/A"} · Score: {source.score?.toFixed(3) ?? "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-slate-100 px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {chatError && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{chatError}</p>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendMessage} className="border-t border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask something about your documents..."
                      disabled={chatLoading}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !question.trim()}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ── Bookings ── */}
            {activePage === "Bookings" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <CalendarDays className="mx-auto text-blue-600" size={36} />
                <h3 className="mt-4 text-xl font-bold">Bookings</h3>
                <p className="mt-2 text-sm text-slate-500">Interview bookings will appear here.</p>
                {stats && (
                  <div className="mt-6 inline-block rounded-xl bg-blue-50 px-6 py-4">
                    <p className="text-3xl font-bold text-blue-600">{stats.active_bookings}</p>
                    <p className="mt-1 text-sm text-slate-600">active confirmed bookings</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
