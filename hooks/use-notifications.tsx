import { useState, useEffect, useCallback } from 'react'

export interface Notification {
  id: number
  titulo: string
  descripcion: string
  tipo: string
  severidad: string
  maquina_id?: number
  fecha: string
  leida: boolean
  eliminada: boolean
  maquinas?: {
    id: number
    nombre: string
    codigo_branch?: string
  }
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (id: number) => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  deleteAllNotifications: () => Promise<void>
  refreshNotifications: () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/notifications')
      if (!response.ok) {
        throw new Error('Error al obtener las notificaciones')
      }
      
      const data = await response.json()
      setNotifications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH'
      })
      
      if (!response.ok) {
        throw new Error('Error al marcar como leída')
      }
      
      // Actualizar el estado local
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, leida: true }
            : notification
        )
      )
    } catch (err) {
      console.error('Error marking notification as read:', err)
      setError(err instanceof Error ? err.message : 'Error al marcar como leída')
    }
  }, [])

  const deleteNotification = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar la notificación')
      }
      
      // Remover de la lista local
      setNotifications(prev => prev.filter(notification => notification.id !== id))
    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }, [])

  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar todas las notificaciones')
      }
      
      // Limpiar la lista local
      setNotifications([])
    } catch (err) {
      console.error('Error deleting all notifications:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar todas')
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  // Calcular notificaciones no leídas
  const unreadCount = notifications.filter(n => !n.leida).length

  // Cargar notificaciones al montar el componente
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications
  }
}
