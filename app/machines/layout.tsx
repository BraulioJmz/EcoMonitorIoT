"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default function MachinesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Always show "Máquinas" as the title
  const getTitle = () => {
    return "Máquinas"
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={getTitle()} showDatePicker={pathname === "/machines/machine_1"} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
