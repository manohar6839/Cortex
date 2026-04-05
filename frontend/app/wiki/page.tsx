"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { wikiAPI } from "@/lib/api"
import { FileText, Folder, FolderOpen, ChevronRight, BookOpen } from "lucide-react"
import Link from "next/link"
import { Card } from "../components/ui/card"
import { PageHeader } from "../components/ui/page-header"
import { EmptyState } from "../components/ui/empty-state"
import { Skeleton } from "../components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Heading {
  id: string
  text: string
  level: number
}

export default function WikiPage() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [hoveredLink, setHoveredLink] = useState<{ slug: string; rect: DOMRect } | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const { data: treeData, isLoading: treeLoading } = useQuery({
    queryKey: ["wiki-tree"],
    queryFn: wikiAPI.tree,
  })

  const { data: articleData, isLoading: articleLoading } = useQuery({
    queryKey: ["wiki-article", selectedPath],
    queryFn: () => (selectedPath ? wikiAPI.article(selectedPath) : null),
    enabled: !!selectedPath,
  })

  // Parse headings for TOC
  const [headings, setHeadings] = useState<Heading[]>([])
  useEffect(() => {
    if (articleData?.content) {
      const lines = articleData.content.split("\n")
      const parsed: Heading[] = []
      for (const line of lines) {
        if (line.startsWith("## ")) {
          const text = line.slice(3).trim()
          const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
          parsed.push({ id, text, level: 2 })
        } else if (line.startsWith("### ")) {
          const text = line.slice(4).trim()
          const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")
          parsed.push({ id, text, level: 3 })
        }
      }
      setHeadings(parsed)
    }
  }, [articleData?.content])

  // Build breadcrumb from path
  const getBreadcrumbs = (path: string | null) => {
    if (!path) return []
    const parts = path.split("/")
    return parts.map((part, i) => ({
      label: part.replace(".md", ""),
      path: parts.slice(0, i + 1).join("/"),
    }))
  }

  const breadcrumbs = getBreadcrumbs(selectedPath)

  // Hover preview logic
  const handleLinkHover = async (slug: string, rect: DOMRect) => {
    setHoveredLink({ slug, rect })
    // Fetch preview data
    try {
      const slugPath = `wiki/${slug}.md`
      const data = await wikiAPI.article(slugPath)
      setPreviewData(data)
    } catch {
      setPreviewData(null)
    }
  }

  const handleLinkLeave = () => {
    setHoveredLink(null)
    setPreviewData(null)
  }

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  const renderTree = (nodes: any[], depth = 0) => {
    return nodes.map((node: any) => (
      <div key={node.path}>
        {node.type === "directory" ? (
          <>
            <button
              onClick={() => toggleDir(node.path)}
              className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-[var(--color-bg-tertiary)] rounded-lg text-left transition-colors cursor-pointer"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              {expandedDirs.has(node.path) ? (
                <FolderOpen size={15} className="text-[var(--color-accent-warning)] flex-shrink-0" />
              ) : (
                <Folder size={15} className="text-[var(--color-accent-warning)] flex-shrink-0" />
              )}
              <span className="text-sm text-[var(--color-text-primary)] truncate">{node.name}</span>
            </button>
            {expandedDirs.has(node.path) && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </>
        ) : (
          <button
            onClick={() => setSelectedPath(node.path)}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-all cursor-pointer",
              selectedPath === node.path
                ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                : "hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <FileText size={15} className="text-[var(--color-text-tertiary)] flex-shrink-0" />
            <span className="text-sm truncate">{node.name.replace(".md", "")}</span>
          </button>
        )}
      </div>
    ))
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        icon={BookOpen}
        title="Wiki"
        description="Browse your compiled knowledge articles."
      />

      <div className="flex gap-6" style={{ height: "calc(100vh - 12rem)" }}>
        {/* File Tree */}
        <Card className="w-60 flex-shrink-0 !p-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[var(--color-border-subtle)]">
            <h2 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Articles</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {treeLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            ) : treeData?.tree?.length ? (
              renderTree(treeData.tree)
            ) : (
              <div className="p-4 text-center">
                <p className="text-xs text-[var(--color-text-tertiary)]">No articles yet.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Article Viewer */}
        <Card className="flex-1 !p-0 overflow-hidden flex flex-col relative">
          {articleLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : articleData ? (
            <>
              <div className="p-5 border-b border-[var(--color-border-subtle)]">
                {/* Breadcrumb */}
                {breadcrumbs.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] mb-3 overflow-x-auto">
                    <button
                      onClick={() => setSelectedPath(null)}
                      className="hover:text-[var(--color-text-primary)] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Wiki
                    </button>
                    {breadcrumbs.map((crumb, i) => (
                      <span key={crumb.path} className="flex items-center gap-1.5 whitespace-nowrap">
                        <ChevronRight size={12} />
                        {i < breadcrumbs.length - 1 ? (
                          <button
                            onClick={() => setSelectedPath(crumb.path)}
                            className="hover:text-[var(--color-text-primary)] transition-colors capitalize cursor-pointer"
                          >
                            {crumb.label}
                          </button>
                        ) : (
                          <span className="text-[var(--color-text-secondary)] capitalize">
                            {crumb.label}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                  {articleData.frontmatter?.title || "Untitled"}
                </h1>
                {articleData.frontmatter?.tags && Array.isArray(articleData.frontmatter.tags) && articleData.frontmatter.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {articleData.frontmatter.tags.map((tag: string) => (
                      <span key={tag} className="tag-pill">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose prose-invert max-w-none" ref={contentRef}>
                  <ArticleContent
                    content={articleData.content}
                    headings={headings}
                    onLinkHover={handleLinkHover}
                    onLinkLeave={handleLinkLeave}
                  />
                </div>
                <WikiLinks links={articleData.wiki_links} />
              </div>

              {/* Table of Contents (right side, floating) */}
              {headings.length >= 3 && (
                <div className="absolute right-4 top-24 w-48">
                  <div className="glass-card !rounded-xl p-3">
                    <div className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                      Contents
                    </div>
                    <div className="space-y-1">
                      {headings.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={cn(
                            "block text-xs py-1 hover:text-[var(--color-accent-primary)] transition-colors",
                            h.level === 3 && "pl-3",
                            "text-[var(--color-text-secondary)]"
                          )}
                        >
                          {h.text}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Wiki-link Hover Preview */}
              {hoveredLink && previewData && (
                <div
                  className="absolute z-50 w-72 glass-card !rounded-xl p-4 shadow-xl animate-fadeIn"
                  style={{
                    top: hoveredLink.rect.top + window.scrollY - 100,
                    left: Math.min(hoveredLink.rect.left, window.innerWidth - 320),
                  }}
                >
                  <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                    {previewData.frontmatter?.title || "Untitled"}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] line-clamp-3">
                    {previewData.content?.slice(0, 150)}...
                  </div>
                  {previewData.frontmatter?.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {previewData.frontmatter.tags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="tag-pill !py-0 !px-2 !text-[10px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {articleData.backlinks?.length > 0 && (
                <div className="p-5 border-t border-[var(--color-border-subtle)]">
                  <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Backlinks</h3>
                  <div className="flex flex-wrap gap-2">
                    {articleData.backlinks.map((link: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPath(link.path)}
                        className="text-sm text-[var(--color-accent-secondary)] hover:underline cursor-pointer px-2 py-1 bg-[var(--color-accent-secondary)]/5 rounded-lg"
                      >
                        {link.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="Select an article"
              description="Choose an article from the sidebar to view its contents."
            />
          )}
        </Card>
      </div>
    </div>
  )
}

function ArticleContent({
  content,
  headings,
  onLinkHover,
  onLinkLeave,
}: {
  content: string
  headings: Heading[]
  onLinkHover: (slug: string, rect: DOMRect) => void
  onLinkLeave: () => void
}) {
  // Build heading ID map
  const headingIds: Record<string, string> = {}
  headings.forEach((h) => (headingIds[h.text.toLowerCase()] = h.id))

  return (
    <div className="space-y-3 leading-relaxed">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) {
          return <h1 key={i} className="text-2xl font-bold text-[var(--color-text-primary)] mt-6">{line.slice(2)}</h1>
        }
        if (line.startsWith("## ")) {
          const text = line.slice(3).trim()
          const id = headingIds[text.toLowerCase()] || text.toLowerCase().replace(/\s+/g, "-")
          return (
            <h2
              key={i}
              id={id}
              className="text-xl font-semibold mt-6 text-[var(--color-text-primary)] scroll-mt-24"
            >
              {text}
            </h2>
          )
        }
        if (line.startsWith("### ")) {
          const text = line.slice(4).trim()
          const id = headingIds[text.toLowerCase()] || text.toLowerCase().replace(/\s+/g, "-")
          return (
            <h3
              key={i}
              id={id}
              className="text-lg font-medium mt-4 text-[var(--color-text-primary)] scroll-mt-24"
            >
              {text}
            </h3>
          )
        }
        if (line.startsWith("- ")) {
          return <li key={i} className="ml-4 text-[var(--color-text-primary)]">{line.slice(2)}</li>
        }
        if (line.trim() === "") return <div key={i} className="h-2" />

        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
        const parts = line.split(wikiLinkRegex)
        if (parts.length > 1) {
          return (
            <p key={i} className="text-[var(--color-text-primary)]">
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <span
                    key={j}
                    className="text-[var(--color-accent-secondary)] hover:underline cursor-pointer"
                    onMouseEnter={(e) => {
                      const slug = part.toLowerCase().replace(/\s+/g, "-")
                      onLinkHover(slug, e.currentTarget.getBoundingClientRect())
                    }}
                    onMouseLeave={onLinkLeave}
                  >
                    {part}
                  </span>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </p>
          )
        }
        return <p key={i} className="text-[var(--color-text-primary)]">{line}</p>
      })}
    </div>
  )
}

function WikiLinks({ links }: { links: string[] }) {
  if (!links?.length) return null
  return (
    <div className="mt-8 pt-6 border-t border-[var(--color-border-subtle)]">
      <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Related Links</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link, i) => (
          <Link
            key={i}
            href={`/wiki?article=${link.toLowerCase().replace(/\s+/g, "-")}`}
            className="px-3 py-1.5 text-sm bg-[var(--color-accent-secondary)]/10 rounded-lg text-[var(--color-accent-secondary)] hover:bg-[var(--color-accent-secondary)]/20 transition-colors"
          >
            {link}
          </Link>
        ))}
      </div>
    </div>
  )
}