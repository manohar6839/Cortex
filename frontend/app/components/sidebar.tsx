"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Download,
  BookOpen,
  Network,
  MessageCircle,
  Search,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/ingest", icon: Download, label: "Ingest" },
  { href: "/wiki", icon: BookOpen, label: "Wiki" },
  { href: "/graph", icon: Network, label: "Graph" },
  { href: "/ask", icon: MessageCircle, label: "Ask" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/health", icon: Activity, label: "Health" },
  { href: "/settings", icon: Settings, label: "Settings" },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  onMobileOpen: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, onMobileOpen }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-card !rounded-none z-[60] flex items-center px-4 gap-3 border-0 border-b border-[var(--color-border-subtle)]">
        <button
          onClick={onMobileOpen}
          aria-label="Open menu"
          className="p-2 -ml-2 hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <span className="font-semibold text-sm">Cortex</span>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar wrapper - slightly wider to contain the overflow toggle button */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full z-[80] transition-all duration-300 ease-out",
          // Mobile: slide in/out
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: collapse/expand  (extra 12px for the toggle button overhang)
          collapsed ? "lg:w-[80px]" : "lg:w-[236px]",
          // Mobile width
          mobileOpen ? "w-60" : "w-0"
        )}
      >
        <aside
          className={cn(
            "h-full bg-[var(--color-bg-secondary)] backdrop-blur-xl border-r border-[var(--color-border-subtle)] flex flex-col",
            collapsed ? "lg:w-[68px]" : "lg:w-56",
            "w-60"
          )}
        >
          {/* Logo */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border-subtle)] flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--color-accent-primary)]/20">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              {(!collapsed || mobileOpen) && (
                <span className="font-bold text-base tracking-tight">Cortex</span>
              )}
            </div>
            {/* Mobile close */}
            <button
              onClick={onMobileClose}
              aria-label="Close menu"
              className="lg:hidden p-1.5 hover:bg-[var(--color-bg-tertiary)] rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto mt-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                    isActive
                      ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[var(--color-accent-primary)] rounded-r-full" />
                  )}
                  <item.icon
                    size={20}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      collapsed && !mobileOpen && "lg:mx-auto"
                    )}
                  />
                  {(!collapsed || mobileOpen) && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Desktop collapse toggle — positioned OUTSIDE aside but INSIDE wrapper */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex absolute top-20 w-6 h-6 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-visible)] items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-all duration-200 shadow-md cursor-pointer"
          style={{ right: "0px" }}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>
    </>
  )
}
