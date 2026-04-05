"use client"

import { useState, useRef } from "react"
import { qaAPI } from "@/lib/api"
import { MessageCircle, Send, Copy, Check, Sparkles, History, Bookmark, BarChart2, Presentation } from "lucide-react"
import { Card } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { PageHeader } from "../components/ui/page-header"
import { cn } from "@/lib/utils"

const suggestedQuestions = [
  "What are the key differences between concept X and concept Y?",
  "Summarize the main findings from recent sources",
  "What connections exist between entity A and entity B?",
]

const STEP_ICONS: Record<string, string> = {
  "reading_index": "📖",
  "reading_article": "📄",
  "synthesizing": "✍️",
  "searching": "🔍",
}

export default function AskPage() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [savedToWiki, setSavedToWiki] = useState(false)
  const [history, setHistory] = useState<{ q: string; a: any }[]>([])
  const [researchSteps, setResearchSteps] = useState<string[]>([])
  const [streamingAnswer, setStreamingAnswer] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    // Cancel any in-progress request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    setAnswer(null)
    setResearchSteps([])
    setStreamingAnswer("")
    setIsStreaming(true)
    setSavedToWiki(false)

    try {
      let finalData: any = null

      for await (const event of qaAPI.stream(question.trim())) {
        if (abortRef.current?.signal.aborted) break

        // Handle step events
        if (event.step) {
          const stepText = event.step
          const icon = STEP_ICONS[event.step_type] || "📄"
          setResearchSteps((prev) => {
            if (prev.includes(stepText)) return prev
            return [...prev, `${icon} ${stepText}`]
          })
        }

        // Handle final answer
        if (event.status === "complete" || event.answer) {
          finalData = event
          if (event.answer) {
            setStreamingAnswer(event.answer)
          }
        }

        // Progressive answer streaming
        if (event.delta) {
          setStreamingAnswer((prev) => prev + event.delta)
        }
      }

      if (finalData) {
        setAnswer(finalData)
        setHistory((prev) => [{ q: question, a: finalData }, ...prev.slice(0, 9)])
      }
    } catch (err) {
      console.error("QA stream error:", err)
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSaveToWiki = async () => {
    if (!question.trim() || !answer) return

    try {
      await qaAPI.ask(question.trim(), true)
      setSavedToWiki(true)
      setTimeout(() => setSavedToWiki(false), 3000)
    } catch (err) {
      console.error("Save to wiki failed:", err)
    }
  }

  const copyAnswer = () => {
    const text = answer?.answer || streamingAnswer
    if (text) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const cancelStream = () => {
    if (abortRef.current) {
      abortRef.current.abort()
      setIsStreaming(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
      <PageHeader
        icon={MessageCircle}
        title="Ask Your Knowledge Base"
        description="Ask questions and get research-grade answers with citations."
      />

      {/* Question Input */}
      <Card className="!p-3">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your knowledge base..."
            className="form-input !py-4 !pr-14 !text-base !bg-transparent !border-transparent"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[var(--color-accent-danger)] rounded-xl text-white hover:brightness-110 transition-all shadow-lg cursor-pointer"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!question.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[var(--color-accent-primary)] rounded-xl text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--color-accent-primary)]/20 cursor-pointer"
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </Card>

      {/* Suggestion Chips */}
      {!answer && !isStreaming && history.length === 0 && (
        <div>
          <div className="section-title">
            <Sparkles size={14} />
            Try asking
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                className="px-4 py-2.5 text-sm text-[var(--color-text-secondary)] glass-card-light hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-visible)] transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Research Progress (SSE streaming) */}
      {isStreaming && (
        <Card>
          <div className="flex items-center gap-3 text-[var(--color-accent-secondary)]">
            <Sparkles size={18} className="animate-pulse" />
            <span className="text-sm font-medium">Researching your question...</span>
          </div>

          {/* Research steps as they arrive */}
          {researchSteps.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Research steps:</div>
              {researchSteps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] animate-fadeIn"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-secondary)]" />
                  {step}
                </div>
              ))}
              {/* Pulsing indicator for current step */}
              {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-4 h-1.5 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] rounded-full animate-pulse w-2/3" />
          </div>

          {/* Streaming answer preview */}
          {streamingAnswer && (
            <div className="mt-4 p-4 rounded-lg bg-[var(--color-bg-tertiary)]/50 border border-[var(--color-border-subtle)]">
              <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Answer preview:</div>
              <div className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                {streamingAnswer}
                <span className="inline-block w-2 h-4 bg-[var(--color-accent-primary)] ml-1 animate-pulse" />
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Answer */}
      {answer && !isStreaming && (
        <Card className="!p-0 overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-success)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Answer</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveToWiki}
                disabled={savedToWiki}
                className={cn(
                  "p-2 hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors cursor-pointer",
                  savedToWiki ? "text-[var(--color-accent-success)]" : "text-[var(--color-text-secondary)]"
                )}
                title="Save as Insight"
              >
                {savedToWiki ? <Check size={16} /> : <Bookmark size={16} />}
              </button>
              <button
                onClick={copyAnswer}
                className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-lg text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? <Check size={16} className="text-[var(--color-accent-success)]" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {researchSteps.length > 0 && (
            <div className="px-6 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]/30">
              <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Research steps:</div>
              <div className="flex flex-wrap gap-2">
                {researchSteps.map((step, i) => (
                  <span key={i} className="tag-pill">{step}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons row */}
          <div className="px-6 py-3 border-b border-[var(--color-border-subtle)] flex gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors cursor-pointer"
              title="Generate Chart (coming soon)"
            >
              <BarChart2 size={14} />
              Generate Chart
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors cursor-pointer"
              title="Generate Slides (coming soon)"
            >
              <Presentation size={14} />
              Generate Slides
            </button>
          </div>

          <div className="p-6">
            <div className="whitespace-pre-wrap text-[var(--color-text-primary)] leading-relaxed">
              {answer.answer || streamingAnswer}
            </div>
          </div>

          {answer.sources?.length > 0 && (
            <div className="px-6 py-4 border-t border-[var(--color-border-subtle)]">
              <div className="text-xs text-[var(--color-text-tertiary)] mb-2">
                Sources ({answer.sources.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {answer.sources.map((source: string, i: number) => (
                  <span key={i} className="tag-pill !text-[var(--color-accent-secondary)] !bg-[var(--color-accent-secondary)]/10 !border-[var(--color-accent-secondary)]/20">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Past Questions */}
      {history.length > 0 && (
        <div>
          <div className="section-title">
            <History size={14} />
            Past Questions
          </div>
          <Card className="!p-2">
            <div className="stagger-children">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuestion(item.q)
                    setAnswer(item.a)
                  }}
                  className="w-full text-left cursor-pointer list-row"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--color-text-primary)]">{item.q}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)] truncate mt-1">
                      {item.a?.answer?.slice(0, 100)}...
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}