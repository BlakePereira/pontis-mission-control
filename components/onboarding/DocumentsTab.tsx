"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, FileText, Download, Loader2, FolderOpen, Eye, Pencil, Check, X } from "lucide-react";

interface DocFile {
  name: string;
  created_at: string;
  size: number;
  type: string;
  url: string | null;
}

const CATEGORIES = [
  { value: "monument-company", label: "Monument Company", color: "#10b981" },
  { value: "florist", label: "Florist / Fulfillment", color: "#3b82f6" },
  { value: "headstone-cleaning", label: "Headstone Cleaning", color: "#f59e0b" },
  { value: "general", label: "General", color: "#888" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getCategoryFromPath(name: string): string {
  const prefix = name.split("/")[0];
  return CATEGORIES.find((c) => c.value === prefix)?.value || "general";
}

function getCategoryLabel(name: string): { label: string; color: string } {
  const prefix = name.split("/")[0];
  return CATEGORIES.find((c) => c.value === prefix) || { label: "General", color: "#888" };
}

function getDisplayName(name: string): string {
  const parts = name.split("/");
  return parts.length > 1 ? parts.slice(1).join("/").replace(/_/g, " ") : name.replace(/_/g, " ");
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isPreviewable(name: string): boolean {
  const ext = getFileExtension(name);
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp"].includes(ext);
}

export default function DocumentsTab() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("monument-company");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<DocFile | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding-docs");
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setError("Failed to load documents");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", selectedCategory);

      try {
        const res = await fetch("/api/onboarding-docs", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.success) {
          setError(`Failed to upload ${file.name}: ${data.error}`);
        }
      } catch {
        setError(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    fetchFiles();
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${getDisplayName(name)}"?`)) return;
    setDeleting(name);
    try {
      await fetch("/api/onboarding-docs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setFiles((prev) => prev.filter((f) => f.name !== name));
      if (previewFile?.name === name) setPreviewFile(null);
    } catch {
      setError("Failed to delete file");
    }
    setDeleting(null);
  };

  const handleRename = async (oldName: string) => {
    if (!renameValue.trim()) {
      setRenamingFile(null);
      return;
    }

    const category = getCategoryFromPath(oldName);
    const ext = getFileExtension(oldName);
    const newName = `${category}/${renameValue.trim().replace(/[^a-zA-Z0-9._\- ]/g, "_")}.${ext}`;

    if (newName === oldName) {
      setRenamingFile(null);
      return;
    }

    try {
      const res = await fetch("/api/onboarding-docs/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchFiles();
      } else {
        setError(`Rename failed: ${data.error}`);
      }
    } catch {
      setError("Failed to rename file");
    }
    setRenamingFile(null);
  };

  const handleDownload = (file: DocFile) => {
    if (!file.url) return;
    const a = document.createElement("a");
    a.href = file.url;
    a.download = getDisplayName(file.name);
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const startRename = (file: DocFile) => {
    const displayName = getDisplayName(file.name);
    const nameWithoutExt = displayName.replace(/\.[^.]+$/, "");
    setRenamingFile(file.name);
    setRenameValue(nameWithoutExt);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  // Group files by category
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    files: files.filter((f) => getCategoryFromPath(f.name) === cat.value),
  }));

  return (
    <div className="space-y-6">
      {/* Preview Modal */}
      {previewFile && previewFile.url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-[#161616] border border-[#2a2a2a] rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
              <h3 className="text-white font-semibold truncate pr-4">
                {getDisplayName(previewFile.name)}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="p-2 rounded-lg hover:bg-[#2a2a2a] text-[#10b981] transition-colors"
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-lg hover:bg-[#2a2a2a] text-[#888] transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              {getFileExtension(previewFile.name) === "pdf" ? (
                <iframe
                  src={previewFile.url}
                  className="w-full h-[70vh] rounded-lg"
                  title={getDisplayName(previewFile.name)}
                />
              ) : ["png", "jpg", "jpeg", "gif", "webp"].includes(
                  getFileExtension(previewFile.name)
                ) ? (
                <img
                  src={previewFile.url}
                  alt={getDisplayName(previewFile.name)}
                  className="max-w-full max-h-[70vh] mx-auto rounded-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto mb-3 text-[#333]" />
                  <p className="text-[#888]">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="mt-3 px-4 py-2 bg-[#10b981] text-black rounded-lg font-semibold text-sm hover:bg-[#0ea572] transition-colors"
                  >
                    Download Instead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <Upload size={20} className="text-[#10b981]" />
          Upload Documents
        </h3>

        {/* Category Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedCategory === cat.value
                  ? "border-2 text-white"
                  : "border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#3a3a3a]"
              }`}
              style={
                selectedCategory === cat.value
                  ? { borderColor: cat.color, backgroundColor: `${cat.color}15` }
                  : {}
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragOver
              ? "border-[#10b981] bg-[#10b981]/5"
              : "border-[#2a2a2a] hover:border-[#3a3a3a]"
          }`}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-[#10b981]">
              <Loader2 size={20} className="animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto mb-2 text-[#555]" />
              <p className="text-[#888] text-sm">
                Drag & drop files here, or <span className="text-[#10b981] underline">browse</span>
              </p>
              <p className="text-[#555] text-xs mt-1">
                PDF, DOC, DOCX, XLS, XLSX, PNG, JPG — Max 10MB
              </p>
            </>
          )}
          <input
            id="file-input"
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Document Library */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#10b981]" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <FolderOpen size={48} className="mx-auto mb-3 text-[#333]" />
          <p className="text-[#888]">No documents uploaded yet</p>
          <p className="text-[#555] text-sm mt-1">
            Upload your agreements, rate sheets, and onboarding materials above
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped
            .filter((g) => g.files.length > 0)
            .map((group) => (
              <div key={group.value} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.label}
                  <span className="text-xs text-[#555] ml-1">({group.files.length})</span>
                </h3>
                <div className="space-y-2">
                  {group.files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-4 py-3 group hover:border-[#3a3a3a] transition-all"
                    >
                      <FileText size={18} className="text-[#888] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {renamingFile === file.name ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(file.name);
                                if (e.key === "Escape") setRenamingFile(null);
                              }}
                              className="bg-[#161616] border border-[#10b981] text-white rounded px-2 py-1 text-sm flex-1 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRename(file.name)}
                              className="p-1 text-[#10b981] hover:bg-[#2a2a2a] rounded"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setRenamingFile(null)}
                              className="p-1 text-[#888] hover:bg-[#2a2a2a] rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-white text-sm truncate">{getDisplayName(file.name)}</p>
                            <p className="text-[#555] text-xs">
                              {formatBytes(file.size)} • {new Date(file.created_at).toLocaleDateString()} • {getFileExtension(file.name).toUpperCase()}
                            </p>
                          </>
                        )}
                      </div>
                      {renamingFile !== file.name && (
                        <div className="flex items-center gap-1">
                          {isPreviewable(file.name) && file.url && (
                            <button
                              onClick={() => setPreviewFile(file)}
                              className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-[#10b981] transition-colors"
                              title="Preview"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {file.url && (
                            <button
                              onClick={() => handleDownload(file)}
                              className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-[#10b981] transition-colors"
                              title="Download"
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => startRename(file)}
                            className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-[#888] transition-colors"
                            title="Rename"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(file.name)}
                            disabled={deleting === file.name}
                            className="p-1.5 rounded-lg hover:bg-[#2a2a2a] text-red-400 transition-colors"
                            title="Delete"
                          >
                            {deleting === file.name ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
