"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LayoutDashboard, Cpu, FileText, Settings, Bell, LogOut, Menu, X, Zap, ChevronDown, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useMachines } from "@/hooks/use-machines"
import { authClient } from "@/lib/auth/client"
import Image from "next/image"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Máquinas",
    href: "/machines",
    icon: Cpu,
    hasSubmenu: true,
  },
  {
    name: "Reportes",
    href: "/reports",
    icon: FileText,
  },
  {
    name: "Configuración",
    href: "/settings",
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { machines, isLoading } = useMachines()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMachinesOpen, setIsMachinesOpen] = useState(false)

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border",
        isCollapsed ? "w-16" : "w-67",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex justify-center w-full">
            <Image
              src="/company_logo.svg"
              alt="EcoMonitor IoT"
              width={100}
              height={100}
              priority
              className="rounded-lg"
            />
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center w-full mb-2">
            <Image
              src="/company_logo.svg"
              alt="EcoMonitor IoT"
              width={48}
              height={48}
              priority
              className="rounded-lg"
            />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.hasSubmenu && pathname?.startsWith(item.href))
            
            return (
              <div key={item.name}>
                {item.hasSubmenu ? (
                  <div>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      onClick={() => setIsMachinesOpen(!isMachinesOpen)}
                      className={cn(
                        "w-full justify-start gap-3 font-medium",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isCollapsed && "px-2",
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span>{item.name}</span>
                          {isMachinesOpen ? (
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          ) : (
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          )}
                        </>
                      )}
                    </Button>
                    
                    {!isCollapsed && isMachinesOpen && (
                      <div className="ml-6 mt-2 space-y-1">
                        <Link href={item.href}>
                          <Button
                            variant={pathname === item.href ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3 text-sm",
                              pathname === item.href
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            )}
                          >
                            <Cpu className="h-3 w-3 flex-shrink-0" />
                            <span>Todas las Máquinas</span>
                          </Button>
                        </Link>
                        {isLoading ? (
                          <div className="px-3 py-2 text-sm text-sidebar-foreground/60">
                            Cargando máquinas...
                          </div>
                        ) : (
                          machines.map((machine) => (
                            <Link key={machine.id} href={`/machines/${machine.id}`}>
                              <Button
                                variant={pathname === `/machines/${machine.id}` ? "default" : "ghost"}
                                className={cn(
                                  "w-full justify-start gap-3 text-sm",
                                  pathname === `/machines/${machine.id}`
                                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                )}
                              >
                                <div className={cn(
                                  "h-3 w-3 flex-shrink-0 rounded-full",
                                  machine.estado ? "bg-emerald-500" : "bg-red-500"
                                )} />
                                <span>{machine.nombre}</span>
                              </Button>
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 font-medium",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isCollapsed && "px-2",
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={async () => {
            await authClient.signOut();
            window.location.href = "/";
          }}
          className={cn(
            "w-full justify-start gap-3 text-sidebar-foreground hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-colors",
            isCollapsed && "px-2",
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  )
}
