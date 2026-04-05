"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsAPI } from "@/lib/api"
import { Settings, Key, Cpu, Eye, EyeOff, Check, AlertCircle, Palette, ToggleRight } from "lucide-react"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { PageHeader } from "../components/ui/page-header"
import { Skeleton } from "../components/ui/skeleton"

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsAPI.get,
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")

  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [models, setModels] = useState<Record<string, string>>({})
  const [theme, setTheme] = useState("dark")
  const [autoCompile, setAutoCompile] = useState(false)

  useEffect(() => {
    if (data) {
      setApiKey(data.llm_provider?.api_key || "")
      setBaseUrl(data.llm_provider?.base_url || "")
      setModels(data.model_assignment || {})
      setTheme(data.general?.theme || "dark")
      setAutoCompile(data.general?.auto_compile || false)
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (settings: any) => settingsAPI.update(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 3000)
    },
    onError: () => {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    },
  })

  const handleSave = () => {
    saveMutation.mutate({
      llm_provider: { api_key: apiKey, base_url: baseUrl },
      model_assignment: models,
      general: { theme, auto_compile: autoCompile },
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
        <PageHeader icon={Settings} title="Settings" />
        <Card><Skeleton className="h-48" /></Card>
        <Card><Skeleton className="h-48" /></Card>
      </div>
    )
  }

  const taskModels = [
    { key: "ingest", label: "Ingest", desc: "Tagging & summarization" },
    { key: "compile", label: "Compile", desc: "Wiki generation" },
    { key: "qa", label: "Q&A", desc: "Research answers" },
    { key: "lint", label: "Lint", desc: "Health checks" },
  ]

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Configure your LLM providers and model assignments."
      />

      {/* LLM Provider */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-primary)]/10 flex items-center justify-center">
            <Key size={16} className="text-[var(--color-accent-primary)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">LLM Provider</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider">Provider</label>
            <div className="form-input !bg-[var(--color-bg-surface)] !border-transparent cursor-default">
              {data?.llm_provider?.name || "MiniMax"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="form-input !pr-12"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer p-1"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wider">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="form-input font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm pt-1">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-success)]" />
            <span className="text-[var(--color-accent-success)] font-medium text-xs">Connected</span>
          </div>
        </div>
      </Card>

      {/* Model Assignment */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-secondary)]/10 flex items-center justify-center">
            <Cpu size={16} className="text-[var(--color-accent-secondary)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Model per Task</h2>
        </div>

        <div className="space-y-1">
          {taskModels.map((task) => (
            <div key={task.key} className="flex items-center justify-between list-row">
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)]">{task.label}</div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{task.desc}</div>
              </div>
              <select
                value={models[task.key] || "MiniMax-Text-01"}
                onChange={(e) => setModels({ ...models, [task.key]: e.target.value })}
                className="form-select"
              >
                <option value="MiniMax-Text-01">MiniMax Text 01</option>
                <option value="abab6.5s-chat">ABAB 6.5S Chat</option>
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* General */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-warning)]/10 flex items-center justify-center">
            <Palette size={16} className="text-[var(--color-accent-warning)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">General</h2>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between list-row">
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">Theme</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Dark mode is default</div>
            </div>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="form-select">
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
            </select>
          </div>
          <div className="flex items-center justify-between list-row">
            <div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">Auto-compile on ingest</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Automatically compile after ingesting</div>
            </div>
            <button
              onClick={() => setAutoCompile(!autoCompile)}
              className={`w-12 h-7 rounded-full transition-all relative cursor-pointer ${
                autoCompile
                  ? "bg-[var(--color-accent-primary)] shadow-[0_0_12px_rgba(124,108,255,0.3)]"
                  : "bg-[var(--color-bg-surface)] border border-[var(--color-border-visible)]"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-md ${
                  autoCompile ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Save */}
      <Card className="!p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            loading={saveMutation.isPending}
            className="flex-1"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {saveStatus === "success" && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-accent-success)] animate-fadeIn font-medium">
              <Check size={16} />
              Saved!
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-accent-danger)] animate-fadeIn font-medium">
              <AlertCircle size={16} />
              Failed
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
