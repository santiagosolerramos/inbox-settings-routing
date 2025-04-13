"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "relative h-screen border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <div className={cn("flex items-center", collapsed && "justify-center w-full")}>
          {!collapsed && <span className="text-xl font-bold text-purple-600">Sofia AI</span>}
          {collapsed && <span className="text-xl font-bold text-purple-600">S</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "hidden md:flex",
            collapsed && "absolute right-[-12px] top-7 h-6 w-6 rounded-full border bg-background",
          )}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <nav className="flex flex-col gap-2 p-2">
        <NavItem
          href="/"
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="Dashboard"
          collapsed={collapsed}
          active={pathname === "/"}
        />
        <NavItem
          href="/inbox"
          icon={<Inbox className="h-5 w-5" />}
          title="Inbox"
          collapsed={collapsed}
          active={pathname === "/inbox"}
        />
        <NavItem
          href="/conversations"
          icon={<MessageSquare className="h-5 w-5" />}
          title="Conversaciones"
          collapsed={collapsed}
          active={pathname === "/conversations"}
        />
        <NavItem
          href="/analytics"
          icon={<BarChart className="h-5 w-5" />}
          title="Analíticas"
          collapsed={collapsed}
          active={pathname === "/analytics"}
        />
        <NavItem
          href="/users"
          icon={<Users className="h-5 w-5" />}
          title="Usuarios"
          collapsed={collapsed}
          active={pathname === "/users"}
        />
        <NavItem
          href="/settings"
          icon={<Settings className="h-5 w-5" />}
          title="Configuración"
          collapsed={collapsed}
          active={pathname.startsWith("/settings")}
        />
      </nav>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  title: string
  collapsed: boolean
  active: boolean
}

function NavItem({ href, icon, title, collapsed, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
        active ? "bg-muted text-foreground" : "hover:bg-transparent hover:text-foreground",
        collapsed ? "justify-center" : "",
      )}
    >
      {icon}
      {!collapsed && <span>{title}</span>}
    </Link>
  )
}

