"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import InboxSettings from "@/components/inbox-settings"

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header collapsed={collapsed} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <InboxSettings />
        </main>
      </div>
    </div>
  )
}

