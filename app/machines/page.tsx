"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts"
import {
  Cpu,
  Search,
  Filter,
  Star,
  StarOff,
  Activity,
  Zap,
  Battery,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMachines } from "@/hooks/use-machines"

// Interface para máquinas de la BD
interface MachineFromDB {
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

// Interface para máquinas combinadas (BD + datos reales)
interface CombinedMachine extends MachineFromDB {
  status: "running" | "idle" | "out_of_hours" | null
  currentPower: number
  todayEnergy: number
  powerFactor: number
  isFavorite: boolean
  phases: {
    L1: { voltage: number; power: number }
    L2: { voltage: number; power: number }
    L3: { voltage: number; power: number }
  }
}

// Interface para stats de máquinas desde la API
interface MachineStats {
  machineId: number
  codigo_branch: string
  watts: number
  equivalentCurrent: number
  energyToday: number
  status: 'running' | 'idle'
}

// Función para combinar datos de BD con datos reales de la API
const combineMachineData = (
  dbMachines: MachineFromDB[], 
  machinesStats: MachineStats[],
  workHoursConfig: { startMinutes: number; endMinutes: number }
): CombinedMachine[] => {
  const statsMap = new Map(machinesStats.map(stat => [stat.machineId, stat]))
  
  const combinedMachines = dbMachines.map((dbMachine) => {
    const stats = statsMap.get(dbMachine.id)
    
    // Si no hay stats, el status es null
    if (!stats) {
      return {
        ...dbMachine,
        status: null,
        currentPower: 0,
        todayEnergy: 0,
        powerFactor: 0,
        isFavorite: dbMachine.favorita,
        phases: {
          L1: { voltage: 0, power: 0 },
          L2: { voltage: 0, power: 0 },
          L3: { voltage: 0, power: 0 },
        }
      }
    }
    
    const watts = stats.watts || 0
    const equivalentCurrent = stats.equivalentCurrent || 0
    
    // Verificar si está fuera del horario laboral
    const outOfHours = isOutOfWorkingHours(workHoursConfig.startMinutes, workHoursConfig.endMinutes)
    
    let status: "running" | "idle" | "out_of_hours"
    if (outOfHours) {
      status = "out_of_hours"
    } else {
      status = equivalentCurrent > 0.5 ? ("running" as const) : ("idle" as const)
    }
    
    return {
      ...dbMachine,
      status,
      currentPower: watts,
      todayEnergy: stats.energyToday || 0,
      powerFactor: stats.equivalentCurrent || 0,
      isFavorite: dbMachine.favorita,
      phases: {
        L1: { voltage: 0, power: 0 },
        L2: { voltage: 0, power: 0 },
        L3: { voltage: 0, power: 0 },
      }
    }
  })
  
  // Ordenar: favoritas primero, luego alfabéticamente
  return combinedMachines.sort((a, b) => {
    // Primero por favorita (favoritas primero)
    if (a.isFavorite !== b.isFavorite) {
      return b.isFavorite ? 1 : -1
    }
    // Luego alfabéticamente por nombre
    return a.nombre.localeCompare(b.nombre)
  })
}


// Función para verificar si está fuera del horario laboral
const isOutOfWorkingHours = (startMinutes: number, endMinutes: number): boolean => {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = domingo, 6 = sábado
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  // Si es sábado (6) o domingo (0), está fuera de horario
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true
  }
  
  // Si está fuera del horario configurado, está fuera de horario
  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return true
  }
  
  return false
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "running":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    case "maintenance":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
    case "idle":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    case "out_of_hours":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "running":
      return <CheckCircle className="h-3 w-3" />
    case "maintenance":
      return <AlertCircle className="h-3 w-3" />
    case "idle":
      return <Clock className="h-3 w-3" />
    case "out_of_hours":
      return <Clock className="h-3 w-3" />
    default:
      return <AlertCircle className="h-3 w-3" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case "running":
      return "En funcionamiento"
    case "maintenance":
      return "Mantenimiento"
    case "idle":
      return "Inactiva"
    case "out_of_hours":
      return "Fuera de horario laboral"
    default:
      return "Error"
  }
}

export default function MachinesPage() {
  const router = useRouter()
  const { machines: dbMachines, isLoading: isDbLoading, updateFavorite } = useMachines()
  const [machines, setMachines] = useState<CombinedMachine[]>([])
  const [selectedMachine, setSelectedMachine] = useState<CombinedMachine | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [isChartLoading, setIsChartLoading] = useState(false)
  const [machinesStats, setMachinesStats] = useState<MachineStats[]>([])
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  const [chartData, setChartData] = useState<Array<{ timestamp: string; power: number; hour: number }>>([])
  const [phasesData, setPhasesData] = useState<{ L1: { voltage: number; power: number }; L2: { voltage: number; power: number }; L3: { voltage: number; power: number } } | null>(null)
  const [workHoursConfig, setWorkHoursConfig] = useState<{ startMinutes: number; endMinutes: number }>({ startMinutes: 450, endMinutes: 1170 })

  // Cargar configuración de horario laboral
  useEffect(() => {
    const fetchWorkHours = async () => {
      try {
        const response = await fetch('/api/settings/chart-time-range')
        if (response.ok) {
          const data = await response.json()
          setWorkHoursConfig({
            startMinutes: data.hora_inicio_minutos ?? 450,
            endMinutes: data.hora_fin_minutos ?? 1170
          })
        }
      } catch (error) {
        console.error('Error fetching work hours config:', error)
      }
    }

    fetchWorkHours()
  }, [])

  // Obtener stats de máquinas desde la API
  useEffect(() => {
    const fetchMachinesStats = async () => {
      try {
        setIsStatsLoading(true)
        const response = await fetch('/api/machines/stats')
        if (response.ok) {
          const data = await response.json()
          setMachinesStats(data.machinesStats || [])
        }
      } catch (error) {
        console.error('Error fetching machines stats:', error)
      } finally {
        setIsStatsLoading(false)
      }
    }

    fetchMachinesStats()
    // Actualizar cada minuto
    const interval = setInterval(fetchMachinesStats, 60000)
    return () => clearInterval(interval)
  }, [])

  // Combinar datos de BD con datos reales cuando se cargan las máquinas y stats
  useEffect(() => {
    if (dbMachines.length > 0 && machinesStats.length > 0) {
      const combinedMachines = combineMachineData(dbMachines, machinesStats, workHoursConfig)
      setMachines(combinedMachines)
    } else if (dbMachines.length > 0 && !isStatsLoading) {
      // Si no hay stats aún pero hay máquinas, usar valores por defecto
      const combinedMachines = combineMachineData(dbMachines, [], workHoursConfig)
      setMachines(combinedMachines)
    }
  }, [dbMachines, machinesStats, isStatsLoading, workHoursConfig])

  const toggleFavorite = async (machineId: number) => {
    try {
      const machine = machines.find(m => m.id === machineId)
      if (!machine) return

      const newFavoriteStatus = !machine.isFavorite
      
      // Update in database
      await updateFavorite(machineId, newFavoriteStatus)
      
      // Update local state and maintain order: favorites first, then alphabetical
      setMachines((prev) => {
        const updatedMachines = prev.map((machine) => 
          machine.id === machineId 
            ? { ...machine, isFavorite: newFavoriteStatus } 
            : machine
        )
        return updatedMachines.sort((a, b) => {
          // Primero por favorita (favoritas primero)
          if (a.isFavorite !== b.isFavorite) {
            return b.isFavorite ? 1 : -1
          }
          // Luego alfabéticamente por nombre
          return a.nombre.localeCompare(b.nombre)
        })
      })
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const openMachineDetails = async (machine: CombinedMachine) => {
    setSelectedMachine(machine)
    setIsDrawerOpen(true)
    setIsChartLoading(true)
    
    // Obtener datos reales de las últimas 24h y métricas por fase
    try {
      const [historyResponse, phasesResponse] = await Promise.all([
        fetch(`/api/machines/${machine.id}/history`),
        fetch(`/api/machines/${machine.id}/phases`)
      ])
      
      if (historyResponse.ok) {
        const historyResult = await historyResponse.json()
        setChartData(historyResult.data || [])
      }
      
      if (phasesResponse.ok) {
        const phasesResult = await phasesResponse.json()
        setPhasesData(phasesResult.phases || null)
      }
    } catch (error) {
      console.error('Error fetching machine details:', error)
      setChartData([])
      setPhasesData(null)
    } finally {
      setIsChartLoading(false)
    }
  }

  const handleMachineClick = (machine: CombinedMachine) => {
    // Navigate to specific machine pages using the DB ID
    router.push(`/machines/${machine.id}`)
  }

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch =
      machine.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      machine.codigo_branch.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || machine.status === statusFilter
    const matchesFavorites = !showFavoritesOnly || machine.isFavorite
    return matchesSearch && matchesStatus && matchesFavorites
  })

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar máquinas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500 focus:border-emerald-500 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-emerald-200 dark:border-emerald-800">
            <SelectItem 
              value="all" 
              className="focus:bg-emerald-50 dark:focus:bg-emerald-950/20 focus:text-emerald-700 dark:focus:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              Todos los estados
            </SelectItem>
            <SelectItem 
              value="running"
              className="focus:bg-emerald-50 dark:focus:bg-emerald-950/20 focus:text-emerald-700 dark:focus:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              En funcionamiento
            </SelectItem>
            <SelectItem 
              value="idle"
              className="focus:bg-emerald-50 dark:focus:bg-emerald-950/20 focus:text-emerald-700 dark:focus:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              Inactiva
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Favorites Toggle */}
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={cn(
            "gap-2 transition-colors",
            showFavoritesOnly 
              ? "bg-emerald-500 hover:bg-emerald-600 text-white hover:text-white border-emerald-500 hover:border-emerald-600" 
              : "bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-foreground hover:text-emerald-700 dark:hover:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700"
          )}
        >
          <Star className="h-4 w-4" />
          Solo favoritas
        </Button>
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {(isDbLoading || isStatsLoading)
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          : filteredMachines.map((machine) => (
              <Card key={machine.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleMachineClick(machine)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-work-sans">{machine.nombre}</CardTitle>
                      <CardDescription className="font-mono">{machine.codigo_branch}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(machine.id)
                      }}
                      className="text-muted-foreground hover:text-yellow-500"
                    >
                      {machine.isFavorite ? (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    {machine.status ? (
                      <Badge className={cn("gap-1", getStatusColor(machine.status))}>
                        {getStatusIcon(machine.status)}
                        {getStatusText(machine.status)}
                      </Badge>
                    ) : (
                      <Skeleton className="h-5 w-32" />
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        Potencia
                      </div>
                      <div className="font-semibold">{machine.currentPower.toFixed(1)} kW</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Battery className="h-3 w-3" />
                        Energía hoy
                      </div>
                      <div className="font-semibold">{machine.todayEnergy.toFixed(1)} kWh</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        Corriente
                      </div>
                      <div className="font-semibold">{machine.powerFactor.toFixed(1)} A</div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openMachineDetails(machine)
                        }}
                        className="gap-1 bg-transparent"
                      >
                        <Eye className="h-3 w-3" />
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Empty State */}
      {!isDbLoading && !isStatsLoading && filteredMachines.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron máquinas</h3>
            <p className="text-muted-foreground text-center">Intenta ajustar los filtros o términos de búsqueda</p>
          </CardContent>
        </Card>
      )}

      {/* Machine Details Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedMachine && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="font-work-sans">{selectedMachine.nombre}</SheetTitle>
                    <SheetDescription className="font-mono">{selectedMachine.codigo_branch}</SheetDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFavorite(selectedMachine.id)}
                    className="text-muted-foreground hover:text-yellow-500"
                  >
                    {selectedMachine.isFavorite ? (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Status and CT Ratio */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estado:</span>
                    {selectedMachine.status ? (
                      <Badge className={cn("gap-1", getStatusColor(selectedMachine.status))}>
                        {getStatusIcon(selectedMachine.status)}
                        {getStatusText(selectedMachine.status)}
                      </Badge>
                    ) : (
                      <Skeleton className="h-5 w-32" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CT Ratio:</span>
                    <span className="text-sm font-mono">{selectedMachine.ct_ratio}</span>
                  </div>
                </div>

                {/* Current Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Métricas Actuales</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{selectedMachine.currentPower.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">kW</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">{selectedMachine.todayEnergy.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">kWh hoy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-chart-2">{selectedMachine.powerFactor.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Corriente (A)</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historical Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Consumo de las últimas 24h</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      {isChartLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="space-y-3 w-full">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis 
                              dataKey="timestamp" 
                              tick={{ fontSize: 12 }} 
                              tickFormatter={(value: string) => {
                                if (!value) return ''
                                const date = new Date(value)
                                return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`
                              }}
                              tickLine={false}
                              axisLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }}
                              tickLine={false}
                              axisLine={false}
                              label={{ value: "Potencia (kW)", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(30, 41, 59, 0.95)",
                                border: "1px solid rgba(71, 85, 105, 0.3)",
                                borderRadius: "8px",
                                color: "white",
                                boxShadow: "0 8px 25px rgba(0, 0, 0, 0.15)",
                                backdropFilter: "blur(12px)",
                              }}
                              labelStyle={{
                                color: "white",
                                fontWeight: "600",
                                fontSize: "13px",
                              }}
                              formatter={(value: number) => [`${value.toFixed(1)} kW`, "Potencia"]}
                              labelFormatter={(value: string) => {
                                if (!value) return ''
                                const date = new Date(value)
                                const day = date.getUTCDate().toString().padStart(2, '0')
                                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
                                const year = date.getUTCFullYear()
                                const hours = date.getUTCHours().toString().padStart(2, '0')
                                const minutes = date.getUTCMinutes().toString().padStart(2, '0')
                                return `${day}/${month}/${year} ${hours}:${minutes}`
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="power"
                              stroke="#10b981"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Phase Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Métricas por Fase</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {phasesData && Object.entries(phasesData).map(([phase, metrics]) => (
                        <div key={phase} className="border rounded-lg p-3">
                          <div className="font-medium text-sm mb-2">Fase {phase}</div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">Voltaje</div>
                              <div className="font-semibold">{metrics.voltage.toFixed(1)} V</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Potencia</div>
                              <div className="font-semibold">{metrics.power.toFixed(1)} kW</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
