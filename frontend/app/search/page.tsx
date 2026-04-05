"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { searchAPI } from "@/lib/api"
import { Search as SearchIcon, FileText } from "lucide-react"
import Link from "next/link"
import { Card } from "../components/ui/card"
import { PageHeader } from "../components/ui/page-header"
import { EmptyState } from "../components/ui/empty-state"
import { SkeletonList } from "../components/ui/skeleton"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => searchAPI.search(searchQuery),
    enabled: !!searchQuery,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchQuery(query.trim())
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
      <PageHeader
        icon={SearchIcon}
        title="Search"
        description="Full-text search across your entire knowledge base."
      />

      {/* Search Input */}
      <Card className="!p-3">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, concepts, entities..."
            className="form-input !py-4 !pr-14 !text-base !bg-transparent !border-transparent"
          />
          <button
            type="submit"
            disabled={!query.trim() || isFetching}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[var(--color-accent-primary)] rounded-xl text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--color-accent-primary)]/20 cursor-pointer"
          >
            {isFetching ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <SearchIcon size={18} />
            )}
          </button>
        </form>
      </Card>

      {/* Results */}
      {isFetching && <SkeletonList count={3} />}

      {data?.results?.length > 0 && !isFetching && (
        <div>
          <div className="section-title mb-4">
            <SearchIcon size={14} />
            Found {data.results.length} results
          </div>
          <Card className="!p-2">
            <div className="stagger-children">
              {data.results.map((result: any, i: number) => (
                <Link
                  key={i}
                  href={`/wiki?article=${result.doc_id}`}
                  className="block group"
                >
                  <div className="list-row items-start">
                    <div className="w-9 h-9 rounded-lg bg-[var(--color-accent-secondary)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={16} className="text-[var(--color-accent-secondary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {result.title}
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                        {result.snippet}
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)] mt-2 font-mono">
                        Score: {result.score.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {data?.results?.length === 0 && searchQuery && !isFetching && (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description={`We couldn't find anything matching "${searchQuery}". Try a different query.`}
        />
      )}

      {!searchQuery && (
        <EmptyState
          icon={SearchIcon}
          title="Search your knowledge"
          description="Enter a query to search across all your articles, concepts, and entities."
        />
      )}
    </div>
  )
}
