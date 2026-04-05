"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { lintAPI } from "@/lib/api"
import { Activity, AlertTriangle, AlertCircle, Info, Wrench, RefreshCw, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { PageHeader } from "../components/ui/page-header"
import { EmptyState } from "../components/ui/empty-state"
import { Skeleton } from "../components/ui/skeleton"
import { useToast } from "@/lib/toast"

export default function HealthPage() {
  const { toast } = useToast()
  const [selectedChecks, setSelectedChecks] = useState<string[] | null>(null)
  const [fixingIssueIndex, setFixingIssueIndex] = useState<number | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lint", selectedChecks],
    queryFn: () => lintAPI.run(selectedChecks || undefined),
  })

  const fixMutation = useMutation({
    mutationFn: (issue: any) => lintAPI.fixIssue(issue.type, issue.details || {}),
    onSuccess: () => {
      toast("Issue fixed successfully!", "success")
      setFixingIssueIndex(null)
      refetch()
    },
    onError: (err) => {
      toast("Failed to fix issue: " + String(err), "error")
      setFixingIssueIndex(null)
    },
  })

  const handleFix = (issue: any, index: number) => {
    setFixingIssueIndex(index)
    fixMutation.mutate(issue)
  }

  const severityConfig = {
    warning: {
      icon: AlertTriangle,
      bg: "bg-[var(--color-accent-warning)]/10",
      text: "text-[var(--color-accent-warning)]",
      border: "border-[var(--color-accent-warning)]/20",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-[var(--color-accent-danger)]/10",
      text: "text-[var(--color-accent-danger)]",
      border: "border-[var(--color-accent-danger)]/20",
    },
    info: {
      icon: Info,
      bg: "bg-[var(--color-accent-secondary)]/10",
      text: "text-[var(--color-accent-secondary)]",
      border: "border-[var(--color-accent-secondary)]/20",
    },
  }

  const score = data?.score ?? 100
  const scoreColor = score >= 80
    ? "var(--color-accent-success)"
    : score >= 60
      ? "var(--color-accent-warning)"
      : "var(--color-accent-danger)"

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
      <PageHeader
        icon={Activity}
        title="Wiki Health Report"
        description="Automated consistency checks, gap detection, and health monitoring."
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
        >
          <RefreshCw size={14} />
          Re-run
        </Button>
      </PageHeader>

      {/* Health Score */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="section-title">
              <Shield size={14} />
              Overall Health Score
            </div>
            {isLoading ? (
              <Skeleton className="h-12 w-28 mt-2" />
            ) : (
              <div className="text-5xl font-bold tracking-tight mt-2" style={{ color: scoreColor }}>
                {score}<span className="text-lg text-[var(--color-text-tertiary)] font-normal ml-1">/100</span>
              </div>
            )}
            <div className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {data?.total_issues ?? 0} issues found in {data?.total_articles ?? 0} articles
            </div>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="var(--color-bg-tertiary)"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={scoreColor}
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${(score) * 2.513} 251.3`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: `drop-shadow(0 0 6px ${scoreColor})`,
                }}
              />
            </svg>
          </div>
        </div>
      </Card>

      {/* Issues */}
      <div>
        <div className="section-title mb-4">
          <AlertCircle size={14} />
          Issues ({data?.total_issues ?? 0})
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <div className="flex items-start gap-3">
                  <Skeleton variant="circle" className="w-10 h-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : data?.issues?.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="All clear!"
            description="No issues found. Your wiki is healthy."
          />
        ) : (
          <Card className="!p-2">
            <div className="stagger-children">
              {data?.issues?.map((issue: any, i: number) => {
                const config = severityConfig[issue.severity as keyof typeof severityConfig] || severityConfig.info
                const Icon = config.icon
                const isFixing = fixingIssueIndex === i
                return (
                  <div key={i} className="list-row items-start">
                    <div className={cn("p-2.5 rounded-xl flex-shrink-0", config.bg)}>
                      <Icon size={16} className={config.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-[var(--color-text-primary)] capitalize">
                          {issue.type.replace("_", " ")}
                        </span>
                        <span className={cn("badge-info", issue.severity === "warning" && "badge-pending", issue.severity === "error" && "!text-[var(--color-accent-danger)] !bg-[var(--color-accent-danger)]/12 !border-[var(--color-accent-danger)]/20")}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{issue.message}</p>
                      {issue.details && (
                        <div className="mt-2 text-xs text-[var(--color-text-tertiary)] font-mono truncate">
                          {issue.details.articles && <span>Articles: {issue.details.articles.join(", ")}</span>}
                          {issue.details.article && <span>Article: {issue.details.article}</span>}
                        </div>
                      )}
                    </div>
                    {issue.auto_fixable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => handleFix(issue, i)}
                        disabled={fixingIssueIndex !== null}
                        loading={isFixing}
                      >
                        {isFixing ? (
                          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                          <Wrench size={14} />
                        )}
                        Fix
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}