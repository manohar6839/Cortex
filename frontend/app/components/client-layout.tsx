"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"
import { CommandPalette } from "./command-palette"

// Sidebar widths must match sidebar.tsx
const SIDEBAR_EXPANDED = 236  // lg:w-[236px] matches sidebar wrapper width
const SIDEBAR_COLLAPSED = 80 // lg:w-[80px]

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onMobileOpen={() => setMobileOpen(true)}
      />

      {/* Main content — uses explicit pixel margin to avoid any Tailwind mismatch */}
      <main
        className="min-h-screen relative z-10 transition-all duration-300"
        style={{
          marginLeft: `${sidebarWidth}px`,
          paddingTop: "2rem",
        }}
      >
        <div className="px-5 pb-8 lg:px-10 lg:pb-10 max-w-[1400px]">
          {children}
        </div>
      </main>

      {/* Command Palette (Cmd+K) */}
      <CommandPalette />
    </>
  )
}
