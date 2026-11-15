import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import {
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
} from "./services/documentService";

import { sendChatMessage } from "./services/chatService";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Documents", icon: Files },
  { name: "AI Assistant", icon: MessageSquare },
  { name: "Bookings", icon: CalendarDays },
];

function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [chunkStrategy, setChunkStrategy] = useState("recursive");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentDetailsLoading, setDocumentDetailsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [conversationId] = useState(() => crypto.randomUUID());
  const [selectedChatDocument, setSelectedChatDocument] = useState("all");
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  const searchInputRef = useRef(null);

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      setDocumentsError("");

      const data = await getDocuments();

      setDocuments(data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);

      setDocumentsError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to load documents.",
      );
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleViewDocument = async (documentId) => {
    try {
      setDocumentDetailsLoading(true);

      const data = await getDocument(documentId);

      setSelectedDocument(data);
    } catch (error) {
      console.error("Failed to fetch document details:", error);
    } finally {
      setDocumentDetailsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId, filename) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${filename}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingDocumentId(documentId);

      await deleteDocument(documentId);

      // Refresh the document list
      await loadDocuments();

      // Close details if the deleted document was selected
      if (selectedDocument?.document_id === documentId) {
        setSelectedDocument(null);
      }

      alert("Document deleted successfully.");
    } catch (error) {
      console.error("Failed to delete document:", error);

      alert(error.response?.data?.detail || "Failed to delete document.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

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

      console.log("Upload successful:", result);

      setUploadResult(result);
      setSelectedFile(null);

      await loadDocuments();
    } catch (error) {
      console.error("Document upload failed:", error);
      console.error("Response:", error.response?.data);
      console.error("Status:", error.response?.status);

      setUploadError(
        error.response?.data?.detail || error.message || "Unknown upload error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const userQuestion = question.trim();

    if (!userQuestion || chatLoading) return;

    // Display the user's message immediately.
    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userQuestion,
      },
    ]);

    setQuestion("");
    setChatLoading(true);
    setChatError("");

    try {
      const result = await sendChatMessage({
        question: userQuestion,
        conversationId,
        documentId:
          selectedChatDocument === "all" ? null : selectedChatDocument,
        limit: 5,
      });

      // Add Gemini's response and retrieved sources.
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.answer,
          sources: result.sources,
          retrievedCount: result.retrieved_count,
        },
      ]);
    } catch (error) {
      console.error("Chat request failed:", error);

      setChatError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to get an answer. Please try again.",
      );
    } finally {
      setChatLoading(false);
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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
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

        {/* Main area */}
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

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setActivePage("Documents");

                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 100);
                }}
                className="hidden rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 sm:block"
                title="Search documents"
              >
                <Search size={19} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                  title="Notifications"
                >
                  <Bell size={19} />

                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-14 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">
                        Notifications
                      </h3>

                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-600">
                        You're all caught up!
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        New notifications will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Dashboard content */}
          <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
            {activePage === "Overview" && (
              <>
                <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Welcome to DocuMind
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Manage your documents and get intelligent answers.
                    </p>
                  </div>

                  <button
                    onClick={() => setActivePage("Documents")}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Add Document
                  </button>
                </section>

                {/* Statistics */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Total Documents", value: "—", icon: Files },
                    {
                      label: "Total Conversations",
                      value: "—",
                      icon: MessageSquare,
                    },
                    {
                      label: "Active Bookings",
                      value: "—",
                      icon: CalendarDays,
                    },
                    { label: "Knowledge Chunks", value: "—", icon: FileText },
                  ].map((stat) => {
                    const Icon = stat.icon;

                    return (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-500">{stat.label}</p>
                          <Icon size={20} className="text-blue-600" />
                        </div>
                        <h3 className="mt-5 text-3xl font-bold">
                          {stat.value}
                        </h3>
                        <p className="mt-2 text-xs text-slate-400">
                          Backend integration pending
                        </p>
                      </div>
                    );
                  })}
                </section>

                {/* Upload section */}
                <section className="grid gap-6 xl:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <div className="mb-5">
                      <h3 className="text-lg font-bold">Upload documents</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Add documents to your AI knowledge base.
                      </p>
                    </div>

                    <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
                      <div className="mb-4 rounded-full bg-blue-100 p-4 text-blue-600">
                        <Upload size={26} />
                      </div>

                      <p className="font-semibold">Click to browse files</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Upload PDF or TXT documents
                      </p>
                      <p className="mt-3 text-xs text-slate-400">
                        Supported formats: PDF, TXT
                      </p>

                      <input
                        type="file"
                        accept=".pdf,.txt"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>

                    {selectedFile && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 p-4">
                        <FileText className="text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(selectedFile.size / 1024).toFixed(1)} KB ·
                            Selected
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assistant card */}
                  <div className="flex flex-col justify-between rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
                    <div>
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="text-xl font-bold">Ask your documents</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        Use AI-powered retrieval to find relevant information
                        from your uploaded documents.
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
                      <p className="mt-1 text-sm text-slate-500">
                        Your recently uploaded files will appear here.
                      </p>
                    </div>

                    <button
                      onClick={() => setActivePage("Documents")}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-8 flex flex-col items-center py-8 text-center">
                    <File size={32} className="text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">
                      No documents yet
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Upload your first document to get started.
                    </p>
                  </div>
                </section>
              </>
            )}

            {activePage === "Documents" && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Document Library</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Upload and manage the documents used by your AI knowledge
                    base.
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="font-bold">Upload a document</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Select a PDF or TXT file to add to your knowledge base.
                      </p>

                      <label className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-blue-400 hover:bg-blue-50">
                        <Upload size={30} className="mb-4 text-blue-600" />
                        <p className="font-semibold">Choose a document</p>
                        <p className="mt-2 text-sm text-slate-500">
                          PDF and TXT files supported
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.txt"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>

                      {selectedFile && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <FileText className="shrink-0 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="font-bold">Processing configuration</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Choose how the document text should be divided into
                        chunks.
                      </p>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <button
                          onClick={() => setChunkStrategy("recursive")}
                          className={`rounded-xl border p-5 text-left transition ${
                            chunkStrategy === "recursive"
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <FileText className="text-blue-600" />
                            <span
                              className={`h-4 w-4 rounded-full border-2 ${
                                chunkStrategy === "recursive"
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-300"
                              }`}
                            />
                          </div>
                          <h4 className="mt-4 font-semibold">
                            Recursive chunking
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Splits text using hierarchical separators while
                            trying to preserve meaningful sections.
                          </p>
                        </button>

                        <button
                          onClick={() => setChunkStrategy("token")}
                          className={`rounded-xl border p-5 text-left transition ${
                            chunkStrategy === "token"
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <File className="text-blue-600" />
                            <span
                              className={`h-4 w-4 rounded-full border-2 ${
                                chunkStrategy === "token"
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-slate-300"
                              }`}
                            />
                          </div>
                          <h4 className="mt-4 font-semibold">
                            Token-based chunking
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Divides text according to token limits for more
                            predictable chunk sizes.
                          </p>
                        </button>
                      </div>

                      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        <p>
                          <strong>Selected strategy:</strong>{" "}
                          {chunkStrategy === "recursive"
                            ? "Recursive"
                            : "Token-based"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Your backend currently uses a default chunk size of
                          500 and overlap of 50.
                        </p>
                      </div>

                      <button
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {uploading
                          ? "Processing document..."
                          : "Upload document"}
                      </button>

                      {uploading && (
                        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                          Processing your document. Extracting text, generating
                          embeddings, and storing vectors...
                        </div>
                      )}

                      {uploadError && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                          {uploadError}
                        </div>
                      )}

                      {uploadResult && (
                        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-5">
                          <h4 className="font-semibold text-green-800">
                            Document uploaded successfully!
                          </h4>

                          <p className="mt-2 text-sm text-green-700">
                            {uploadResult.message}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            {[
                              ["Chunks", uploadResult.chunk_count],
                              ["Embeddings", uploadResult.embedding_count],
                              ["Dimensions", uploadResult.embedding_dimensions],
                              ["Characters", uploadResult.character_count],
                              ["Stored vectors", uploadResult.stored_vectors],
                              ["Strategy", uploadResult.chunking_strategy],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="rounded-lg bg-white p-3"
                              >
                                <p className="text-xs text-slate-500">
                                  {label}
                                </p>
                                <p className="mt-1 break-words font-bold text-slate-900">
                                  {value}
                                </p>
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
                        {[
                          "Document upload",
                          "Text extraction",
                          "Text chunking",
                          "Embedding generation",
                          "Qdrant storage",
                          "Metadata persistence",
                        ].map((step, index) => (
                          <div key={step} className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                              {index + 1}
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-6 text-white">
                      <Sparkles className="text-blue-400" size={25} />
                      <h3 className="mt-4 font-bold">Knowledge base</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Uploaded documents become searchable knowledge through
                        embeddings and semantic retrieval.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Uploaded Documents */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Uploaded Documents</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Documents stored in your knowledge base.
                      </p>
                    </div>

                    <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
                      {documents.length} Documents
                    </span>
                  </div>

                  <div className="mt-6">
                    <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <Search size={18} className="text-slate-400" />

                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search documents by filename..."
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-3">
                      {documentsLoading ? (
                        <p className="py-6 text-center text-sm text-slate-500">
                          Loading documents...
                        </p>
                      ) : documentsError ? (
                        <p className="py-6 text-center text-sm text-red-600">
                          {documentsError}
                        </p>
                      ) : documents.filter((document) =>
                          document.filename
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        ).length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-500">
                          {documents.length === 0
                            ? "No documents uploaded yet."
                            : "No matching documents found."}
                        </p>
                      ) : (
                        documents
                          .filter((document) =>
                            document.filename
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                          )
                          .map((document) => (
                            <div
                              key={document.document_id}
                              className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="rounded-lg bg-blue-50 p-3">
                                  <FileText
                                    className="text-blue-600"
                                    size={22}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-800">
                                    {document.filename}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {document.created_at
                                      ? new Date(
                                          document.created_at,
                                        ).toLocaleString()
                                      : "Date unavailable"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-slate-600">
                                  {document.chunk_count} chunks
                                </span>

                                <span className="text-slate-600">
                                  {document.embedding_dimensions} dimensions
                                </span>

                                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                  {document.status}
                                </span>
                                <button
                                  onClick={() =>
                                    handleViewDocument(document.document_id)
                                  }
                                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                >
                                  View Details
                                </button>

                                <button
                                  onClick={() =>
                                    handleDeleteDocument(
                                      document.document_id,
                                      document.filename,
                                    )
                                  }
                                  disabled={
                                    deletingDocumentId === document.document_id
                                  }
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deletingDocumentId === document.document_id
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Details */}
                {documentDetailsLoading && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-700">
                    Loading document details...
                  </div>
                )}

                {selectedDocument && !documentDetailsLoading && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold">Document Details</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Metadata retrieved from your backend.
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedDocument(null)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>

                    <h4 className="mt-6 break-all text-base font-semibold">
                      {selectedDocument.filename}
                    </h4>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        ["Document ID", selectedDocument.document_id],
                        [
                          "Chunking Strategy",
                          selectedDocument.chunking_strategy,
                        ],
                        ["Character Count", selectedDocument.character_count],
                        ["Chunk Count", selectedDocument.chunk_count],
                        [
                          "Embedding Dimensions",
                          selectedDocument.embedding_dimensions,
                        ],
                        ["Status", selectedDocument.status],
                        [
                          "Created At",
                          selectedDocument.created_at
                            ? new Date(
                                selectedDocument.created_at,
                              ).toLocaleString()
                            : "Unavailable",
                        ],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">
                            {label}
                          </p>
                          <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                            {value ?? "Unavailable"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {activePage === "AI Assistant" && (
              <section className="flex h-[calc(100vh-180px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Chat Header */}
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3">
                      <Sparkles className="text-blue-600" size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800">
                        DocuMind AI Assistant
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ask questions about your uploaded documents
                      </p>
                    </div>
                  </div>

                  {/* Document Selector */}
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-slate-600">
                      Search in
                    </label>

                    <select
                      value={selectedChatDocument}
                      onChange={(event) =>
                        setSelectedChatDocument(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="all">All documents</option>

                      {documents.map((document) => (
                        <option
                          key={document.document_id}
                          value={document.document_id}
                        >
                          {document.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Sparkles size={38} className="text-blue-500" />

                      <h3 className="mt-4 text-lg font-bold text-slate-800">
                        Ask your documents anything
                      </h3>

                      <p className="mt-2 max-w-md text-sm text-slate-500">
                        DocuMind retrieves relevant information from your
                        uploaded documents and generates answers using AI.
                      </p>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-7">
                          {message.content}
                        </p>

                        {message.role === "assistant" &&
                          message.sources?.length > 0 && (
                            <div className="mt-4 border-t border-slate-300 pt-3">
                              <p className="mb-2 text-xs font-bold">
                                Sources ({message.retrievedCount})
                              </p>

                              {message.sources.map((source, sourceIndex) => (
                                <div
                                  key={sourceIndex}
                                  className="mb-2 text-xs text-slate-600"
                                >
                                  <p className="font-semibold">
                                    {source.filename}
                                  </p>
                                  <p>
                                    Chunk: {source.chunk_index ?? "N/A"}
                                    {" · "}
                                    Score: {source.score?.toFixed(3) ?? "N/A"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="text-sm text-slate-500">
                      DocuMind is thinking...
                    </div>
                  )}

                  {chatError && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {chatError}
                    </p>
                  )}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="border-t border-slate-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Ask something about your documents..."
                      disabled={chatLoading}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
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

            {activePage === "Bookings" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <CalendarDays className="mx-auto text-blue-600" size={36} />
                <h3 className="mt-4 text-xl font-bold">Bookings</h3>
                <p className="mt-2 text-sm text-slate-500">
                  We'll connect bookings to your backend next.
                </p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
