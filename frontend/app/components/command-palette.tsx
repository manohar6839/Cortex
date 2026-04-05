"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Upload, Play, FileText, Network, Activity, Settings, X, Command } from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandItem {
  id: string
  label: string
  icon: any
  category: "quick" | "navigation" | "recent"
  action: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandItem[] = [
    { id: "add-url", label: "Add URL", icon: Plus, category: "quick", action: () => { router.push("/ingest"); setOpen(false) } },
    { id: "upload", label: "Upload File", icon: Upload, category: "quick", action: () => { router.push("/ingest?tab=upload"); setOpen(false) } },
    { id: "compile", label: "Compile Sources", icon: Play, category: "quick", action: () => { router.push("/"); setOpen(false) } },
    { id: "search", label: "Search", icon: Search, category: "quick", action: () => { router.push("/search"); setOpen(false) } },
    { id: "wiki", label: "Go to Wiki", icon: FileText, category: "navigation", action: () => { router.push("/wiki"); setOpen(false) } },
    { id: "graph", label: "Go to Graph", icon: Network, category: "navigation", action: () => { router.push("/graph"); setOpen(false) } },
    { id: "health", label: "Health Check", icon: Activity, category: "navigation", action: () => { router.push("/health"); setOpen(false) } },
    { id: "settings", label: "Settings", icon: Settings, category: "navigation", action: () => { router.push("/settings"); setOpen(false) } },
    { id: "ask", label: "Ask a Question", icon: Command, category: "quick", action: () => { router.push("/ask"); setOpen(false) } },
  ]

  const filteredCommands = query.trim()
    ? commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  // Reset selected when filtered changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        filteredCommands[selectedIndex]?.action()
      }
    },
    [filteredCommands, selectedIndex]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 glass-card !rounded-2xl overflow-hidden animate-fadeIn">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <Search size={18} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none text-sm"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-lg cursor-pointer"
          >
            <X size={16} className="text-[var(--color-text-tertiary)]" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
              No commands found
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              {filteredCommands.filter((c) => c.category === "quick").length > 0 && (
                <div className="px-3 py-1">
                  <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider px-2 mb-1">
                    Quick Actions
                  </div>
                  {filteredCommands
                    .filter((c) => c.category === "quick")
                    .map((cmd, i) => {
                      const globalIndex = filteredCommands.indexOf(cmd)
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            globalIndex === selectedIndex
                              ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                              : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                          )}
                        >
                          <cmd.icon size={16} className="flex-shrink-0" />
                          <span className="text-sm font-medium">{cmd.label}</span>
                        </button>
                      )
                    })}
                </div>
              )}

              {/* Navigation */}
              {filteredCommands.filter((c) => c.category === "navigation").length > 0 && (
                <div className="px-3 py-1">
                  <div className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider px-2 mb-1">
                    Navigation
                  </div>
                  {filteredCommands
                    .filter((c) => c.category === "navigation")
                    .map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd)
                      return (
                        <button
                          key={cmd.id}
                          onClick={cmd.action}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            globalIndex === selectedIndex
                              ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                              : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
                          )}
                        >
                          <cmd.icon size={16} className="flex-shrink-0" />
                          <span className="text-sm font-medium">{cmd.label}</span>
                        </button>
                      )
                    })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--color-border-subtle)] flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[10px] font-mono">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[10px] font-mono">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-bg-tertiary)] text-[10px] font-mono">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}