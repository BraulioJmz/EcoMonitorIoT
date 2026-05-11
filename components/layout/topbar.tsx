"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { Search, Bell, User, Settings, LogOut, Calendar, Maximize, Minimize, AlertTriangle, Check, X, Trash2, ChevronRight, Home } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useNotifications } from "@/hooks/use-notifications"

interface TopbarProps {
  title: string
  showDatePicker?: boolean
}

export function Topbar({ title, showDatePicker = false }: TopbarProps) {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, deleteNotification, deleteAllNotifications } = useNotifications()
  const [searchQuery, setSearchQuery] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Función auxiliar para formatear tiempo
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Hace un momento'
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours !== 1 ? 's' : ''}`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border">
      {/* Left side - Title and Date Picker */}
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-bold font-work-sans text-foreground">{title}</h1>
      </div>

      {/* Right side - Search, Notifications, User */}
      <div className="flex items-center space-x-4">
        {/* Search */}

        {/* Fullscreen Toggle */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleFullscreen}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96 p-0" align="end" forceMount>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteAllNotifications()
                      }}
                      title="Borrar todas las notificaciones"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Borrar todas
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay notificaciones</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div key={notification.id} className={`p-0 ${!notification.leida ? 'bg-muted/20' : ''}`}>
                    <div className="flex items-start space-x-3 p-4 w-full hover:bg-muted/30 transition-colors">
                      <div className="shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          notification.leida ? 'bg-muted/50' : 'bg-destructive/10'
                        }`}>
                          <AlertTriangle className={`h-4 w-4 ${
                            notification.leida ? 'text-muted-foreground' : 'text-destructive'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-semibold leading-tight ${
                            notification.leida ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {notification.titulo}
                          </p>
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">
                            {formatTimeAgo(notification.fecha)}
                          </span>
                        </div>
                        <p className={`text-sm mt-2 leading-relaxed ${
                          notification.leida ? 'text-muted-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.descripcion}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline"
                              className={`text-xs px-2 py-0.5 font-medium ${
                                notification.severidad === 'Crítico' 
                                  ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900' 
                                  : notification.severidad === 'Moderado'
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 dark:hover:bg-yellow-900'
                                  : notification.severidad === 'Informativo'
                                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                              }`}
                            >
                              {notification.severidad}
                            </Badge>
                            {notification.maquinas && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {notification.maquinas.nombre}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {!notification.leida && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                title="Marcar como leída"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteNotification(notification.id)
                              }}
                              title="Eliminar notificación"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-8 w-8 rounded-full data-[state=open]:bg-muted/50 hover:bg-muted/50 focus:bg-muted/50 transition-colors duration-200"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold border border-primary/20">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium leading-none">{user?.username || 'Usuario'}</p>
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-2 py-0.5 font-medium"
                  >
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Usuario'}
                  </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'email@ejemplo.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
