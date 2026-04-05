"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { graphAPI } from "@/lib/api"
import { Network } from "lucide-react"
import { Card } from "../components/ui/card"
import { Select } from "../components/ui/input"
import { PageHeader } from "../components/ui/page-header"
import { EmptyState } from "../components/ui/empty-state"
import dynamic from "next/dynamic"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((mod) => {
  return mod.default || mod
}), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)] rounded-full animate-spin" />
    </div>
  ),
})

export default function GraphPage() {
  const [filter, setFilter] = useState("all")
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const { data, isLoading } = useQuery({
    queryKey: ["graph", filter],
    queryFn: () => graphAPI.get(filter),
  })

  // Resize observer for container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect()
      setDimensions({
        width: Math.max(rect.width, 200),
        height: Math.max(rect.height, 200),
      })
    }

    updateDimensions()

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
      // Reload graph after resize
      if (graphRef.current) {
        graphRef.current.reload()
      }
    })

    resizeObserver.observe(container)

    // Window resize fallback
    const handleResize = () => {
      updateDimensions()
      if (graphRef.current) {
        graphRef.current.reload()
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const colors: Record<string, string> = {
    concept: "#6C63FF",
    entity: "#4ECDC4",
    connection: "#FFB347",
    raw: "#9898A6",
  }

  const graphData = data ? {
    nodes: data.nodes.map((n: any) => ({
      ...n,
      color: colors[n.type] || "#9898A6",
    })),
    links: data.edges.map((e: any) => ({
      ...e,
      color: "rgba(255,255,255,0.08)",
    })),
  } : { nodes: [], links: [] }

  const handleNodeClick = useCallback((node: any) => {
    // Navigate to wiki article if available
    if (node.type && node.slug) {
      window.location.href = `/wiki?article=${node.slug}`
    }
  }, [])

  return (
    <div className="animate-fadeIn">
      <PageHeader
        icon={Network}
        title="Knowledge Graph"
        description="Visualize relationships between concepts and entities."
      >
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="concepts">Concepts</option>
          <option value="entities">Entities</option>
          <option value="connections">Connections</option>
          <option value="raw">Raw Sources</option>
        </Select>
      </PageHeader>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="!p-0 overflow-hidden relative"
        style={{ height: "calc(100vh - 12rem)" }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center glass-card">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto border-2 border-[var(--color-accent-primary)]/30 border-t-[var(--color-accent-primary)] rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-text-secondary)]">Loading graph...</p>
            </div>
          </div>
        ) : !data?.nodes?.length ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState
              icon={Network}
              title="No nodes yet"
              description="Compile some sources to build your knowledge graph."
              actionLabel="Add Sources"
              actionHref="/ingest"
            />
          </div>
        ) : (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeRelSize={6}
              nodeLabel="label"
              nodeColor="color"
              linkColor={() => "rgba(255,255,255,0.08)"}
              linkWidth={1}
              backgroundColor="transparent"
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              width={dimensions.width}
              height={dimensions.height}
              onNodeClick={handleNodeClick}
              nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                const fontSize = 12 / globalScale
                ctx.font = `${fontSize}px Inter`
                ctx.fillStyle = node.color || "#9898A6"
                ctx.textAlign = "center"
                ctx.fillText(node.label || "", node.x, node.y + fontSize * 1.5)
              }}
            />
            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-card !rounded-xl p-3 text-xs">
              <div className="flex items-center gap-4">
                {[
                  { label: "Concepts", color: "#6C63FF" },
                  { label: "Entities", color: "#4ECDC4" },
                  { label: "Connections", color: "#FFB347" },
                  { label: "Sources", color: "#9898A6" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[var(--color-text-secondary)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}