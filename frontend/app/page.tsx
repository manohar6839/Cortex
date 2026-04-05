"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { statsAPI, compileAPI, logAPI } from "@/lib/api"
import {
  Database,
  FileText,
  Network,
  Activity,
  Plus,
  Upload,
  MessageSquare,
  Play,
  ArrowRight,
  Sparkles,
  Zap,
  TrendingUp,
  Download,
  MessageCircle,
  Heart,
  Clock,
  Check,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { SkeletonCard } from "./components/ui/skeleton"
import { PageHeader } from "./components/ui/page-header"

// Map event types to icons + colors
const EVENT_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  ingest: { icon: Download, color: "text-violet-400 bg-violet-500/10", label: "Ingest" },
  compile: { icon: Play, color: "text-green-400 bg-green-500/10", label: "Compile" },
  insight: { icon: MessageCircle, color: "text-blue-400 bg-blue-500/10", label: "Insight" },
  lint: { icon: Heart, color: "text-amber-400 bg-amber-500/10", label: "Lint" },
  query: { icon: MessageSquare, color: "text-teal-400 bg-teal-500/10", label: "Query" },
}

function timeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp.replace(" ", "T"))
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return `${Math.floor(diffHrs / 24)}d ago`
}

interface CompileProgress {
  status: "idle" | "compiling" | "complete"
  message: string
  current?: number
  total?: number
  articles?: string[]
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [compileProgress, setCompileProgress] = useState<CompileProgress>({
    status: "idle",
    message: "",
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: statsAPI.get,
    refetchInterval: 30000,
  })

  const { data: logData } = useQuery({
    queryKey: ["log"],
    queryFn: () => logAPI.get(10),
    refetchInterval: 15000,
  })

  const handleCompile = async () => {
    if (!stats?.sources?.pending) return

    setCompileProgress({ status: "compiling", message: "Starting compilation..." })

    try {
      // Use SSE streaming
      for await (const event of compileAPI.stream(false)) {
        if (event.status === "starting") {
          setCompileProgress({
            status: "compiling",
            message: event.message || "Starting...",
          })
        } else if (event.status === "progress") {
          setCompileProgress({
            status: "compiling",
            message: `Processing ${event.current}/${event.total}...`,
            current: event.current,
            total: event.total,
          })
        } else if (event.status === "complete") {
          const summary = event.summary || event.result
          const articles = summary?.articles?.split(", ").filter(Boolean) || []
          setCompileProgress({
            status: "complete",
            message: `Compiled ${summary?.total || 0} sources`,
            articles,
          })
          // Refresh data
          queryClient.invalidateQueries({ queryKey: ["stats"] })
          queryClient.invalidateQueries({ queryKey: ["log"] })
          // Reset after 5 seconds
          setTimeout(() => {
            setCompileProgress({ status: "idle", message: "" })
          }, 5000)
        }
      }
    } catch (error) {
      console.error("Compile failed:", error)
      setCompileProgress({
        status: "idle",
        message: "Compilation failed",
      })
    }
  }

  const statCards = [
    {
      label: "Sources",
      value: stats?.sources?.total ?? 0,
      icon: Database,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
      href: "/ingest",
    },
    {
      label: "Concepts",
      value: stats?.articles?.concepts ?? 0,
      icon: FileText,
      gradient: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      href: "/wiki",
    },
    {
      label: "Entities",
      value: stats?.articles?.entities ?? 0,
      icon: Network,
      gradient: "from-teal-500/20 to-teal-600/5",
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/10",
      href: "/wiki",
    },
    {
      label: "Health",
      value: `${stats?.health_score ?? 100}%`,
      icon: Activity,
      gradient: (stats?.health_score ?? 100) >= 80
        ? "from-emerald-500/20 to-emerald-600/5"
        : "from-amber-500/20 to-amber-600/5",
      iconColor: (stats?.health_score ?? 100) >= 80 ? "text-emerald-400" : "text-amber-400",
      iconBg: (stats?.health_score ?? 100) >= 80 ? "bg-emerald-500/10" : "bg-amber-500/10",
      href: "/health",
    },
  ]

  const logEntries: any[] = logData?.entries ?? []

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn space-y-8">
      <PageHeader
        icon={Sparkles}
        title="Welcome back"
        description="Your AI research team, in a browser."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <Link key={card.label} href={card.href} className="block group">
                <Card variant="stat" glow="primary" className="relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", card.gradient)} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.iconBg, card.iconColor)}>
                        <card.icon size={20} />
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                    <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-1 tracking-tight">
                      {card.value}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">{card.label}</div>
                  </div>
                </Card>
              </Link>
            ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="flex items-center gap-2.5 mb-5">
          <Zap size={16} className="text-[var(--color-accent-warning)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/ingest">
            <Button variant="primary" size="md">
              <Plus size={18} />
              Add URL
            </Button>
          </Link>
          <Link href="/ingest">
            <Button variant="secondary" size="md">
              <Upload size={18} />
              Upload
            </Button>
          </Link>
          <Link href="/ingest">
            <Button variant="secondary" size="md">
              <MessageSquare size={18} />
              Quick Note
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={handleCompile}
            disabled={!stats?.sources?.pending || compileProgress.status === "compiling"}
          >
            {compileProgress.status === "compiling" ? (
              <>
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Compiling...
              </>
            ) : (
              <>
                <Play size={18} />
                Compile
              </>
            )}
            {stats?.sources?.pending > 0 && compileProgress.status !== "compiling" && (
              <span className="badge-pending ml-1">
                {stats.sources.pending}
              </span>
            )}
          </Button>
        </div>

        {/* Compile Progress */}
        {compileProgress.status !== "idle" && (
          <div className="mt-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-2">
              {compileProgress.status === "complete" ? (
                <>
                  <Check size={16} className="text-[var(--color-accent-success)]" />
                  <span className="text-[var(--color-accent-success)]">{compileProgress.message}</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)] rounded-full animate-spin" />
                  <span>{compileProgress.message}</span>
                </>
              )}
            </div>
            {compileProgress.status === "compiling" && compileProgress.total && (
              <div className="h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] rounded-full transition-all"
                  style={{ width: `${((compileProgress.current || 0) / compileProgress.total) * 100}%` }}
                />
              </div>
            )}
            {compileProgress.status === "complete" && compileProgress.articles && compileProgress.articles.length > 0 && (
              <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
                Created: {compileProgress.articles.slice(0, 5).join(", ")}
                {compileProgress.articles.length > 5 && ` +${compileProgress.articles.length - 5} more`}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Activity Log & Top Topics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Activity Log */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Activity size={16} className="text-[var(--color-accent-success)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Activity Log</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>

          {logEntries.length > 0 ? (
            <div className="space-y-1">
              {logEntries.map((entry, i) => {
                const cfg = EVENT_CONFIG[entry.event_type] ?? EVENT_CONFIG["ingest"]
                const Icon = cfg.icon
                return (
                  <div key={i} className="list-row items-start py-2.5">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.color)}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--color-text-primary)] leading-snug truncate">
                        {entry.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-text-tertiary)] capitalize">
                          {entry.event_type}
                        </span>
                        {entry.details?.articles_created && (
                          <span className="text-xs text-[var(--color-text-tertiary)]">
                            · {entry.details.articles_created} articles
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] flex-shrink-0">
                      <Clock size={11} />
                      {timeAgo(entry.timestamp)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Activity size={28} className="mx-auto mb-3 text-[var(--color-text-tertiary)] opacity-40" />
              <div className="text-sm text-[var(--color-text-tertiary)]">No activity yet.</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-1 opacity-70">
                Add a source and compile to see it here.
              </div>
            </div>
          )}
        </Card>

        {/* Top Topics */}
        <Card>
          <div className="flex items-center gap-2.5 mb-5">
            <TrendingUp size={16} className="text-[var(--color-accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">Top Topics</h2>
          </div>
          {stats?.top_tags?.length > 0 ? (
            <div className="space-y-4">
              {stats.top_tags.slice(0, 6).map(([tag, count]: [string, number]) => {
                const percentage = Math.round((count / stats.top_tags[0][1]) * 100)
                return (
                  <div key={tag} className="flex items-center gap-4">
                    <span className="text-sm text-[var(--color-text-secondary)] w-24 truncate font-medium flex items-center gap-1.5">
                      <span className="text-[var(--color-accent-secondary)]">#</span>
                      {tag}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] rounded-full transition-all duration-700"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-[var(--color-text-tertiary)] w-12 text-right font-mono">
                      {percentage}%
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)] w-6 text-right font-mono">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp size={28} className="mx-auto mb-3 text-[var(--color-text-tertiary)] opacity-40" />
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Ingest and compile sources to see your knowledge domains.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
