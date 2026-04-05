"use client"

import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ingestAPI, rawAPI } from "@/lib/api"
import { Link2, Upload, FileText, Check, AlertCircle, Download, Database, Clock, X } from "lucide-react"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { PageHeader } from "../components/ui/page-header"
import { EmptyState } from "../components/ui/empty-state"
import { SkeletonList } from "../components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useToast } from "@/lib/toast"

// URL Platform detection
const URL_PLATFORMS = {
  youtube: { label: "YouTube", icon: "🎬", regex: /(?:youtube\.com|youtu\.be)/ },
  github: { label: "GitHub", icon: "🐙", regex: /github\.com/ },
  reddit: { label: "Reddit", icon: "🤖", regex: /reddit\.com/ },
  twitter: { label: "Twitter/X", icon: "🐦", regex: /(?:twitter\.com|x\.com)/ },
  pdf: { label: "PDF", icon: "📄", regex: /\.pdf$/ },
} as const

type PlatformKey = keyof typeof URL_PLATFORMS | "generic"

function detectUrlPlatform(url: string): { platform: PlatformKey; config: typeof URL_PLATFORMS[PlatformKey] } {
  for (const [key, config] of Object.entries(URL_PLATFORMS)) {
    if (config.regex.test(url)) {
      return { platform: key as PlatformKey, config }
    }
  }
  return { platform: "generic", config: { label: "Web", icon: "🌐", regex: /./ } }
}

// Queue item type
interface QueueItem {
  id: string
  url: string
  status: "pending" | "processing" | "done" | "error"
  preview?: any
  error?: string
}

const tabs = [
  { id: "url" as const, label: "URL", icon: Link2 },
  { id: "upload" as const, label: "Upload", icon: Upload },
  { id: "note" as const, label: "Quick Note", icon: FileText },
]

export default function IngestPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [url, setUrl] = useState("")
  const [activeTab, setActiveTab] = useState<"url" | "upload" | "note">("url")
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [editableTags, setEditableTags] = useState<string[]>([])

  // Detect platform from URL
  const detected = url.trim() ? detectUrlPlatform(url) : null

  const ingestMutation = useMutation({
    mutationFn: (url: string) => ingestAPI.url(url),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["sources"] })
      toast("Content extracted successfully!", "success")

      // Update queue item with preview
      setQueue((prev) =>
        prev.map((item) =>
          item.url === url ? { ...item, status: "done" as const, preview: data.preview } : item
        )
      )
      if (data.preview?.tags) {
        setEditableTags(data.preview.tags)
      }
      setUrl("")
    },
    onError: (error, url) => {
      toast("Failed to extract content. Please try again.", "error")
      setQueue((prev) =>
        prev.map((item) =>
          item.url === url ? { ...item, status: "error" as const, error: String(error) } : item
        )
      )
    },
  })

  const noteMutation = useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      ingestAPI.note(title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      queryClient.invalidateQueries({ queryKey: ["sources"] })
      setNoteTitle("")
      setNoteContent("")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      const id = `q-${Date.now()}`
      setQueue((prev) => [...prev, { id, url: url.trim(), status: "processing" }])
      ingestMutation.mutate(url.trim())
    }
  }

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (noteTitle.trim() && noteContent.trim()) {
      noteMutation.mutate({ title: noteTitle, content: noteContent })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const id = `q-${Date.now()}`
      setQueue((prev) => [...prev, { id, url: file.name, status: "processing" }])

      const formData = new FormData()
      formData.append("file", file)
      fetch("/api/ingest/upload", {
        method: "POST",
        body: formData,
      })
        .then((r) => r.json())
        .then((data) => {
          queryClient.invalidateQueries({ queryKey: ["stats"] })
          queryClient.invalidateQueries({ queryKey: ["sources"] })
          toast("File uploaded successfully!", "success")
          setQueue((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: "done" as const, preview: data.preview } : item
            )
          )
        })
        .catch(() => {
          toast("Failed to upload file.", "error")
          setQueue((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: "error" as const } : item))
          )
        })
    }
  }

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }

  const removeTag = (tag: string) => {
    setEditableTags((prev) => prev.filter((t) => t !== tag))
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
      <PageHeader
        icon={Download}
        title="Add to Knowledge Base"
        description="Paste any URL, upload files, or create a quick note."
      />

      {/* Tabs */}
      <div className="tab-bar w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "tab-item flex items-center gap-2",
              activeTab === tab.id && "active"
            )}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* URL Input */}
      {activeTab === "url" && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste any URL (YouTube, GitHub, article, PDF...)"
                className="form-input"
              />
              {/* Platform detection badge */}
              {detected && url.trim() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-fadeIn">
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-visible)] text-xs font-medium">
                    <span>{detected.config.icon}</span>
                    <span className="text-[var(--color-text-secondary)]">{detected.config.label}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div className="space-y-2 animate-fadeIn">
                <div className="text-xs text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider">
                  Processing Queue
                </div>
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]"
                  >
                    {item.status === "processing" && (
                      <div className="w-4 h-4 border-2 border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)] rounded-full animate-spin" />
                    )}
                    {item.status === "done" && (
                      <Check size={16} className="text-[var(--color-accent-success)]" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle size={16} className="text-[var(--color-accent-danger)]" />
                    )}
                    <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">
                      {item.url}
                    </span>
                    {item.status !== "processing" && (
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="p-1 hover:bg-[var(--color-bg-surface)] rounded-lg cursor-pointer"
                      >
                        <X size={14} className="text-[var(--color-text-tertiary)]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" disabled={!url.trim()} loading={ingestMutation.isPending}>
              <Link2 size={18} />
              {ingestMutation.isPending ? "Extracting..." : "Extract Content"}
            </Button>

            {ingestMutation.isSuccess && (
              <div className="flex items-center gap-2 text-[var(--color-accent-success)] text-sm animate-fadeIn">
                <Check size={18} />
                <span>Content extracted successfully!</span>
              </div>
            )}
            {ingestMutation.isError && (
              <div className="flex items-center gap-2 text-[var(--color-accent-danger)] text-sm animate-fadeIn">
                <AlertCircle size={18} />
                <span>Failed to extract content. Please try again.</span>
              </div>
            )}

            {/* Rich preview card */}
            {ingestMutation.data?.preview && (
              <Card variant="light" className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    {detected && (
                      <span className="inline-flex items-center gap-1.5 mb-2">
                        <span className="text-lg">{detected.config.icon}</span>
                        <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
                          {detected.config.label}
                        </span>
                      </span>
                    )}
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-lg">
                      {ingestMutation.data.preview.title}
                    </h3>
                    {ingestMutation.data.preview.channel && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        {ingestMutation.data.preview.channel}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
                    {ingestMutation.data.preview.word_count} words
                  </div>
                </div>

                {ingestMutation.data.preview.summary && (
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {ingestMutation.data.preview.summary}
                  </p>
                )}

                {/* Editable tags */}
                {editableTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editableTags.map((tag) => (
                      <span
                        key={tag}
                        className="tag-pill flex items-center gap-1.5 cursor-pointer group"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {ingestMutation.data.preview.transcript_available !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        ingestMutation.data.preview.transcript_available
                          ? "bg-[var(--color-accent-success)]"
                          : "bg-[var(--color-text-tertiary)]"
                      }`}
                    />
                    <span className="text-[var(--color-text-tertiary)]">
                      {ingestMutation.data.preview.transcript_available
                        ? "Transcript available"
                        : "No transcript"}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" size="sm">
                    Re-extract
                  </Button>
                </div>
              </Card>
            )}
          </form>
        </Card>
      )}

      {/* Upload */}
      {activeTab === "upload" && (
        <Card>
          <div className="border-2 border-dashed border-[var(--color-border-visible)] rounded-xl p-12 text-center hover:border-[var(--color-accent-primary)]/30 transition-colors">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
              <Upload size={24} className="text-[var(--color-text-tertiary)]" />
            </div>
            <p className="text-[var(--color-text-secondary)] mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-[var(--color-text-tertiary)] mb-5">
              Supports: PDF files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              id="file-upload"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] border border-[var(--color-border-visible)] rounded-xl transition-all duration-200 cursor-pointer">
                <Upload size={16} />
                Browse Files
              </span>
            </label>
          </div>
        </Card>
      )}

      {/* Quick Note */}
      {activeTab === "note" && (
        <Card>
          <form onSubmit={handleNoteSubmit} className="space-y-4">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Note title"
              className="form-input"
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your note..."
              rows={6}
              className="form-input resize-none"
            />
            <Button
              type="submit"
              disabled={!noteTitle.trim() || !noteContent.trim()}
              loading={noteMutation.isPending}
            >
              <FileText size={18} />
              {noteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </form>
        </Card>
      )}

      {/* Recent Sources */}
      <div>
        <div className="section-title">
          <Clock size={14} />
          Recent Sources
        </div>
        <RecentSources />
      </div>
    </div>
  )
}

function RecentSources() {
  const { data, isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: rawAPI.list,
  })

  if (isLoading) {
    return <SkeletonList count={3} />
  }

  if (!data?.sources?.length) {
    return (
      <EmptyState
        icon={Database}
        title="No sources yet"
        description="Add a URL or upload a file to get started building your knowledge base."
        actionLabel="Add Source"
        actionHref="/ingest"
      />
    )
  }

  return (
    <Card className="!p-2">
      <div className="stagger-children">
        {data.sources.slice(0, 15).map((source: any, index: number) => (
          <div key={source.id || source.file_path || `source-${index}`} className="list-row">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-surface)] flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-[var(--color-text-tertiary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--color-text-primary)] truncate text-sm">{source.title}</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {source.platform} • {source.word_count} words
              </div>
            </div>
            <span className={source.status === "compiled" ? "badge-compiled" : "badge-pending"}>
              {source.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
