import { useState, useEffect } from 'react'

interface Machine {
  id: number
  nombre: string
  codigo_branch: string
  ct_ratio: string
  potencia_maxima: number
  estado: boolean
  favorita: boolean
  created_at: string
  updated_at: string
}

export const useMachines = () => {
  const [machines, setMachines] = useState<Machine[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMachines = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/machines')
      if (!response.ok) {
        throw new Error('Failed to fetch machines')
      }
      const data: Machine[] = await response.json()
      
      // Ordenar máquinas alfabéticamente por nombre (para sidebar)
      const sortedMachines = data.sort((a, b) => a.nombre.localeCompare(b.nombre))
      setMachines(sortedMachines)
    } catch (error) {
      console.error('Error fetching machines:', error)
      setMachines([]) // Fallback to empty array
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMachines()
  }, [])

  const updateFavorite = async (machineId: number, favorita: boolean) => {
    try {
      const response = await fetch(`/api/machines/${machineId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ favorita }),
      })

      if (!response.ok) {
        throw new Error('Failed to update favorite')
      }

      // Update local state and maintain alphabetical order (for sidebar)
      setMachines(prev => {
        const updatedMachines = prev.map(machine =>
          machine.id === machineId ? { ...machine, favorita } : machine
        )
        return updatedMachines.sort((a, b) => a.nombre.localeCompare(b.nombre))
      })
    } catch (error) {
      console.error('Error updating favorite:', error)
      throw error
    }
  }

  return {
    machines,
    isLoading,
    refetch: fetchMachines,
    updateFavorite
  }
}
