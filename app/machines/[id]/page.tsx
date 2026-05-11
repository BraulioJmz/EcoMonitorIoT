"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend, BarChart, Bar, ReferenceLine } from "recharts"
import React from "react"
import {
  Zap,
  Battery,
  Activity,
  DollarSign,
  Leaf,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  ChevronRight,
  Home,
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  CheckCircle,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"


// Mock data for Machine 1 (Línea A - Cortadora)
const mockMachineData = {
  id: "line-a-001",
  name: "Línea A - Cortadora",
  branchCode: "LA-001",
  status: "running",
  currentPower: 245.8,
  todayEnergy: 1847.2,
  powerFactor: 0.92,
  location: "Planta Principal - Sector A",
  ctRatio: "200:5",
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

// Helper functions for machine status
const getStatusColor = (status: string) => {
  switch (status) {
    case "running":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    case "idle":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    case "out_of_hours":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "running":
      return <CheckCircle className="h-3 w-3" />
    case "idle":
      return <Clock className="h-3 w-3" />
    case "out_of_hours":
      return <Clock className="h-3 w-3" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case "running":
      return "En funcionamiento"
    case "idle":
      return "Inactiva"
    case "out_of_hours":
      return "Fuera de horario laboral"
    default:
      return "Inactiva"
  }
}

// Generate mock data based on time period
const generateMockData = (period: string, dataType: string) => {
  const dataPoints = period === "day" ? 24 : period === "week" ? 7 : 30;
  const baseValue = dataType === "power" ? 220 : 
                   dataType === "voltage" ? 220 : 
                   dataType === "current" ? 125 : 
                   dataType === "energy" ? 1800 : 0;

  return Array.from({ length: dataPoints }, (_, i) => {
    let timeLabel, value;
    
    if (period === "day") {
      timeLabel = `${i.toString().padStart(2, '0')}:00`;
      value = baseValue + Math.random() * 30 + Math.sin(i / 4) * 15 + Math.cos(i / 6) * 8;
    } else if (period === "week") {
      const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      timeLabel = days[i];
      value = baseValue + Math.random() * 40 + Math.sin(i / 2) * 20;
    } else { // month
      timeLabel = `${i + 1}`;
      value = baseValue + Math.random() * 50 + Math.sin(i / 3) * 25;
    }

    return {
      time: timeLabel,
      [dataType]: Math.max(0, value),
    };
  });
}

interface ChartDataPoint {
  time: string
  [key: string]: string | number
}

export default function Machine1Page() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const machineId = params?.id
  const [machineName, setMachineName] = useState<string>("")
  const [branchCode, setBranchCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [powerData, setPowerData] = useState<ChartDataPoint[]>([])
  const [kwhPowerData, setKwhPowerData] = useState<Array<{ timestamp: string; imported: number; exported: number }>>([])
  const [voltageData, setVoltageData] = useState<ChartDataPoint[]>([])
  const [currentData, setCurrentData] = useState<ChartDataPoint[]>([])
  const [energyData, setEnergyData] = useState<ChartDataPoint[]>([])
  const [currentPowerKw, setCurrentPowerKw] = useState<number>(0)
  const [todayEnergy, setTodayEnergy] = useState<number | { imported: number; exported: number }>(0)
  const [tarifaPico, setTarifaPico] = useState<number>(0)
  const [estimatedCost, setEstimatedCost] = useState<number>(0)
  const [carbonFootprint, setCarbonFootprint] = useState<number>(0)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateRangeLimits, setDateRangeLimits] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  // Fechas seleccionadas en el calendario (temporales)
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(undefined)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined)
  // Fechas aplicadas (las que se usan para textos y gráficas)
  const [appliedDateRangeStart, setAppliedDateRangeStart] = useState<Date | undefined>(undefined)
  const [appliedDateRangeEnd, setAppliedDateRangeEnd] = useState<Date | undefined>(undefined)
  const [machineStatus, setMachineStatus] = useState<"running" | "idle" | "out_of_hours" | null>(null)
  const [workHoursConfig, setWorkHoursConfig] = useState<{ startMinutes: number; endMinutes: number }>({ startMinutes: 450, endMinutes: 1170 })
  const [dailyPowerChartData, setDailyPowerChartData] = useState<Array<{ day: string; imported: number; exported: number; total_kwh: number }>>([])

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

  // Cargar nombre/código desde la BD
  useEffect(() => {
    const load = async () => {
      if (!machineId) return
      try {
        const res = await fetch(`/api/machines/${machineId}`)
        if (res.ok) {
          const m = await res.json()
          if (m?.nombre) setMachineName(m.nombre)
          if (m?.codigo_branch) setBranchCode(m.codigo_branch)
        }
      } catch (e) {
        console.error('Error fetching machine:', e)
      }
    }
    load()
  }, [machineId])

  // Obtener estado de la máquina (running/idle/out_of_hours basado en equivalentCurrent y horario)
  useEffect(() => {
    const fetchMachineStatus = async () => {
      if (!machineId) return
      try {
        const response = await fetch('/api/machines/stats')
        if (response.ok) {
          const data = await response.json()
          const machineStats = data.machinesStats?.find((stat: any) => stat.machineId === Number(machineId))
          if (machineStats) {
            // Verificar si está fuera del horario laboral
            const outOfHours = isOutOfWorkingHours(workHoursConfig.startMinutes, workHoursConfig.endMinutes)
            
            let status: "running" | "idle" | "out_of_hours"
            if (outOfHours) {
              status = "out_of_hours"
            } else {
              // Si equivalentCurrent > 0.5, está en funcionamiento, sino está inactiva
              status = machineStats.equivalentCurrent > 0.5 ? "running" : "idle"
            }
            setMachineStatus(status)
          }
        }
      } catch (error) {
        console.error('Error fetching machine status:', error)
      }
    }

    fetchMachineStatus()
    // Actualizar cada minuto
    const interval = setInterval(fetchMachineStatus, 60000)
    return () => clearInterval(interval)
  }, [machineId, workHoursConfig])

  // Cargar rango de fechas disponible (por máquina) y series iniciales de voltaje/corriente
  useEffect(() => {
    const load = async () => {
      if (!machineId) return
      try {
        setIsLoading(true)
        const dr = await fetch(`/api/dashboard/date-range?machineId=${machineId}`)
        const drj = await dr.json()
        if (drj.startDate && drj.endDate) {
          setDateRangeLimits({ start: new Date(drj.startDate), end: new Date(drj.endDate) })
        }
        const [v, c, p, e, t, pw, co2, cost] = await Promise.all([
          fetch(`/api/dashboard/voltage-data?machineId=${machineId}`),
          fetch(`/api/dashboard/current-data?machineId=${machineId}`),
          fetch(`/api/dashboard/branch-current-power?machineId=${machineId}`),
          fetch(`/api/dashboard/branch-energy?machineId=${machineId}`),
          fetch(`/api/settings/tariffs`),
          fetch(`/api/dashboard/branch-power-data?machineId=${machineId}`),
          fetch(`/api/dashboard/co2-emissions?machineId=${machineId}`),
          fetch(`/api/dashboard/estimated-cost?machineId=${machineId}`)
        ])
        const [vj, cj, pj, ej, tj, pwj, co2j, costj] = await Promise.all([v.json(), c.json(), p.json(), e.json(), t.json(), pw.json(), co2.json(), cost.json()])
        if (vj.data) setVoltageData(vj.data)
        if (cj.data) setCurrentData(cj.data)
        if (pj?.data?.wattsKw != null) setCurrentPowerKw(pj.data.wattsKw)
        // Para máquina 7, usar imported/exported; para otras, usar kwh
        if (machineId === "7" && ej?.data) {
          setTodayEnergy({
            imported: ej.data.imported || 0,
            exported: ej.data.exported || 0
          })
        } else if (ej?.data?.kwh != null) {
          setTodayEnergy(ej.data.kwh)
        }
        if (tj?.tarifa_pico != null) setTarifaPico(Number(tj.tarifa_pico))
        if (pwj.data) setPowerData(pwj.data)
        if (machineId === "7") {
          const kwhResponse = await fetch(`/api/dashboard/branch-kwh-data?machineId=${machineId}`)
          const kwhJson = await kwhResponse.json()
          if (kwhJson?.data) {
            setKwhPowerData(kwhJson.data)
          } else {
            setKwhPowerData([])
          }
        } else {
          setKwhPowerData([])
        }
        if (co2j?.co2_kg != null) setCarbonFootprint(co2j.co2_kg)
        if (costj?.estimatedCost != null) setEstimatedCost(costj.estimatedCost)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [machineId])

  // Calcular costo estimado cuando cambien todayEnergy o tarifaPico (solo si no es máquina 7)
  // Para la máquina 7, el costo viene directamente del endpoint estimated-cost
  useEffect(() => {
    // Para la máquina 7, no calcular manualmente, usar el valor del endpoint
    if (machineId === "7") return
    
    const energyValue = typeof todayEnergy === 'number' ? todayEnergy : todayEnergy.imported
    const cost = energyValue * tarifaPico
    setEstimatedCost(cost)
  }, [todayEnergy, tarifaPico, machineId])

  // Mock data solo para energía (potencia ya viene de BD)
  useEffect(() => {
    setEnergyData(generateMockData("day", "energy"))
  }, [])

  // Texto de rango para descripciones (usa las fechas aplicadas)
  const getRangeLabel = () => {
    if (appliedDateRangeStart && appliedDateRangeEnd) {
      return `Rango: ${format(appliedDateRangeStart, "dd/MM/yyyy", { locale: es })} - ${format(appliedDateRangeEnd, "dd/MM/yyyy", { locale: es })}`
    }
    if (appliedDateRangeStart) {
      return `Día: ${format(appliedDateRangeStart, "dd/MM/yyyy", { locale: es })}`
    }
    return "Últimas mediciones disponibles"
  }

  const getYAxisLabel = (type: string) => {
    switch (type) {
      case "power": return "Potencia (kW)"
      case "voltage": return "Voltaje (V)"
      case "current": return "Corriente (A)"
      case "energy": return "Energía (kWh)"
      default: return ""
    }
  }

  const getTooltipFormatter = (type: string) => {
    switch (type) {
      case "power": return (value: number) => [`${value.toFixed(1)} kW`, "Potencia"]
      case "voltage": return (value: number) => [`${value.toFixed(1)} V`, "Voltaje"]
      case "current": return (value: number) => [`${value.toFixed(1)} A`, "Corriente"]
      case "energy": return (value: number) => [`${value.toFixed(1)} kWh`, "Energía"]
      default: return (value: number) => [`${value.toFixed(1)}`, "Valor"]
    }
  }

  const getDataKey = (type: string) => {
    switch (type) {
      case "power": return "power"
      case "voltage": return "voltage"
      case "current": return "current"
      case "energy": return "energy"
      default: return "value"
    }
  }

  const getStrokeColor = (type: string) => {
    switch (type) {
      case "power": return "#10b981" // Emerald
      case "voltage": return "#3b82f6" // Blue
      case "current": return "#f97316" // Orange
      case "energy": return "#8b5cf6" // Violet
      default: return "#10b981"
    }
  }

  const powerTooltipFormatter = (value: number, name: string) => {
    const labelMap: Record<string, string> = {
      power: "Potencia",
      imported: "kWh importados",
      exported: "kWh exportados"
    }
    const suffix = name === "power" ? "kW" : "kWh"
    return [`${Number(value ?? 0).toFixed(1)} ${suffix}`, labelMap[name] ?? name]
  }

  const showKwhLines = machineId === "7" && kwhPowerData.length > 0

  const mergedPowerData = useMemo(() => {
    if (!powerData.length && !kwhPowerData.length) return [] as Array<Record<string, any>>

    const map = new Map<string, Record<string, any>>()

    powerData.forEach(item => {
      const timestamp = (item.timestamp ?? item.time) as string | undefined
      if (!timestamp) return
      const entry = map.get(timestamp) || { timestamp }
      if (item.power !== undefined) {
        entry.power = Number(item.power)
      } else if ((item as any).value !== undefined) {
        entry.power = Number((item as any).value)
      }
      map.set(timestamp, entry)
    })

    kwhPowerData.forEach(item => {
      const entry = map.get(item.timestamp) || { timestamp: item.timestamp }
      entry.imported = item.imported
      entry.exported = item.exported
      map.set(item.timestamp, entry)
    })

    return Array.from(map.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [powerData, kwhPowerData])

  const isSingleLineMachine = machineId === "4"

  const hasLine1 = !isSingleLineMachine && currentData.some(point => typeof (point as any).line1 === "number")
  const hasLine2 = !isSingleLineMachine && currentData.some(point => typeof (point as any).line2 === "number")
  const hasLine3 = !isSingleLineMachine && currentData.some(point => typeof (point as any).line3 === "number")

  const currentTooltipFormatter = (value: number, name: string) => {
    const labelMap: Record<string, string> = {
      current: "Corriente equivalente",
      line1: "Línea 1",
      line2: "Línea 2",
      line3: "Línea 3"
    }
    const formattedValue = `${Number(value ?? 0).toFixed(1)} A`
    return [formattedValue, labelMap[name] ?? name]
  }

  // (Eliminado selector por periodo; usamos sólo rango con calendario)

  // Utilidades de calendario como en dashboard
  const normalizeDateToMidnight = (date: Date) => {
    const normalized = new Date(date)
    normalized.setUTCHours(0, 0, 0, 0)
    return normalized
  }

  const isDateDisabled = (date: Date) => {
    if (!dateRangeLimits.start || !dateRangeLimits.end) {
      return true
    }
    const normalizedDate = normalizeDateToMidnight(date)
    const normalizedStart = normalizeDateToMidnight(dateRangeLimits.start)
    const normalizedEnd = normalizeDateToMidnight(dateRangeLimits.end)
    return normalizedDate < normalizedStart || normalizedDate > normalizedEnd
  }

  const handleDateSelectRange = (date: Date | undefined) => {
    if (!date) {
      setIsCalendarOpen(false)
      return
    }
    if (isDateDisabled(date)) return
    if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
      setDateRangeStart(date)
      setDateRangeEnd(undefined)
      return
    }
    if (dateRangeStart && !dateRangeEnd) {
      if (date < dateRangeStart) {
        setDateRangeEnd(dateRangeStart)
        setDateRangeStart(date)
      } else {
        setDateRangeEnd(date)
      }
    }
  }

  const getDateDisplayText = () => {
    if (dateRangeStart && dateRangeEnd) {
      return `${format(dateRangeStart, "dd/MM/yyyy", { locale: es })} - ${format(dateRangeEnd, "dd/MM/yyyy", { locale: es })}`
    } else if (dateRangeStart) {
      return format(dateRangeStart, "dd/MM/yyyy", { locale: es })
    }
    return "Seleccionar rango de fechas"
  }

  // Custom Calendar Component
  const CustomCalendar = () => {
    const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    const isDateDisabledLocal = (day: number) => isDateDisabled(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 0,0,0,0))
    const isDateSelected = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 0,0,0,0)
      if (dateRangeStart && date.toDateString() === dateRangeStart.toDateString()) return true
      if (dateRangeEnd && date.toDateString() === dateRangeEnd.toDateString()) return true
      if (dateRangeStart && dateRangeEnd && date >= dateRangeStart && date <= dateRangeEnd) return true
      return false
    }
    const handleDayClick = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 0,0,0,0)
      if (!isDateDisabledLocal(day)) handleDateSelectRange(date)
    }
    
    const goToPreviousMonth = () => {
      const newMonth = new Date(currentMonth)
      newMonth.setMonth(currentMonth.getMonth() - 1)
      setCurrentMonth(newMonth)
    }
    
    const goToNextMonth = () => {
      const newMonth = new Date(currentMonth)
      newMonth.setMonth(currentMonth.getMonth() + 1)
      setCurrentMonth(newMonth)
    }
    
    const canGoPrevious = () => {
      if (!dateRangeLimits.start) return false
      const normalizedCurrent = normalizeDateToMidnight(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0,0,0,0))
      const normalizedStart = normalizeDateToMidnight(dateRangeLimits.start)
      return normalizedCurrent > normalizedStart
    }
    const canGoNext = () => {
      if (!dateRangeLimits.end) return false
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1, 0,0,0,0)
      const normalizedNext = normalizeDateToMidnight(nextMonth)
      const normalizedEnd = normalizeDateToMidnight(dateRangeLimits.end)
      return normalizedNext <= normalizedEnd
    }
    
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return (
      <div className="w-80 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            disabled={!canGoPrevious()}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            disabled={!canGoNext()}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div key={index} className="h-8 flex items-center justify-center">
              {day && (
                <button
                  onClick={() => handleDayClick(day)}
                  disabled={isDateDisabledLocal(day)}
                  className={cn(
                    "w-full h-full rounded-md text-sm transition-colors",
                    isDateSelected(day)
                      ? "bg-primary text-primary-foreground"
                      : isDateDisabledLocal(day)
                      ? "text-muted-foreground opacity-50 cursor-not-allowed"
                      : "hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  )}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Aplicar rango
  const applyRange = async () => {
    if (!machineId) return
    try {
      setIsLoading(true)
      
      // Aplicar las fechas seleccionadas a las fechas aplicadas
      setAppliedDateRangeStart(dateRangeStart)
      setAppliedDateRangeEnd(dateRangeEnd)
      
      let q = ''
      if (dateRangeStart && dateRangeEnd) {
        // Normalizar fechas a UTC: inicio a 00:00:00 y fin a 23:59:59.999
        const s = new Date(dateRangeStart)
        s.setUTCHours(0, 0, 0, 0)
        const e = new Date(dateRangeEnd)
        e.setUTCHours(23, 59, 59, 999)
        q = `?startDate=${s.toISOString()}&endDate=${e.toISOString()}&machineId=${machineId}`
      } else if (dateRangeStart) {
        const s = new Date(dateRangeStart)
        s.setUTCHours(0, 0, 0, 0)
        const e = new Date(dateRangeStart)
        e.setUTCHours(23, 59, 59, 999)
        q = `?startDate=${s.toISOString()}&endDate=${e.toISOString()}&machineId=${machineId}`
      } else {
        q = `?machineId=${machineId}`
        // Si no hay fechas seleccionadas, limpiar las fechas aplicadas
        setAppliedDateRangeStart(undefined)
        setAppliedDateRangeEnd(undefined)
      }
      const [v, c, pw, co2, avgPower, cost, energy] = await Promise.all([
        fetch(`/api/dashboard/voltage-data${q}`),
        fetch(`/api/dashboard/current-data${q}`),
        fetch(`/api/dashboard/branch-power-data${q}`),
        fetch(`/api/dashboard/co2-emissions${q}`),
        fetch(`/api/dashboard/branch-average-power${q}`),
        fetch(`/api/dashboard/estimated-cost${q}`),
        fetch(`/api/dashboard/branch-energy${q}`)
      ])
      const [vj, cj, pwj, co2j, avgPowerj, costj, ej] = await Promise.all([v.json(), c.json(), pw.json(), co2.json(), avgPower.json(), cost.json(), energy.json()])
      if (vj.data) setVoltageData(vj.data)
      if (cj.data) setCurrentData(cj.data)
      if (pwj.data) setPowerData(pwj.data)
      if (co2j?.co2_kg != null) setCarbonFootprint(co2j.co2_kg)
      if (avgPowerj?.wattsKw != null) setCurrentPowerKw(avgPowerj.wattsKw)
      if (costj?.estimatedCost != null) setEstimatedCost(costj.estimatedCost)
      // Actualizar energía del ciclo
      if (machineId === "7" && ej?.data) {
        setTodayEnergy({
          imported: ej.data.imported || 0,
          exported: ej.data.exported || 0
        })
      } else if (ej?.data?.kwh != null) {
        setTodayEnergy(ej.data.kwh)
      }
      if (machineId === "7") {
        const kwhResponse = await fetch(`/api/dashboard/branch-kwh-data${q}`)
        const kwhJson = await kwhResponse.json()
        if (kwhJson?.data) {
          setKwhPowerData(kwhJson.data)
        } else {
          setKwhPowerData([])
        }
      } else {
        setKwhPowerData([])
      }
      
      // Cargar gráfica de potencia por día si hay rango de fechas
      if (dateRangeStart && dateRangeEnd) {
        const dailyPowerResponse = await fetch(`/api/dashboard/daily-power-totals${q}`)
        const dailyPowerJson = await dailyPowerResponse.json()
        if (dailyPowerJson?.data) {
          setDailyPowerChartData(dailyPowerJson.data)
        } else {
          setDailyPowerChartData([])
        }
      } else {
        setDailyPowerChartData([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
        </button>
        <ChevronRight className="h-4 w-4" />
        <button 
          onClick={() => router.push('/machines')}
          className="hover:text-foreground transition-colors"
        >
          Máquinas
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{machineName || 'Cargando…'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {machineName ? (
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-work-sans text-foreground">{machineName}</h1>
              {machineStatus ? (
                <Badge className={cn("gap-1", getStatusColor(machineStatus))}>
                  {getStatusIcon(machineStatus)}
                  {getStatusText(machineStatus)}
                </Badge>
              ) : (
                <Skeleton className="h-6 w-32" />
              )}
            </div>
          ) : (
            <Skeleton className="h-6 w-48" />
          )}
          {branchCode ? (
            <div className="text-muted-foreground font-mono mt-2">{branchCode}</div>
          ) : (
            <Skeleton className="h-4 w-28 mt-2" />
          )}
        </div>
        
        {/* Filters: solo calendario + aplicar */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          {/* Date Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={
                  "border-emerald-200 dark:border-emerald-800 data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-emerald-950/20 relative flex min-w-[280px] max-w-[350px] items-center justify-center gap-3 rounded-md border bg-transparent px-4 py-2 text-sm shadow-xs transition-[color,box-shadow,background-color] hover:bg-emerald-50 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                }
                type="button">
                <CalendarIcon className="h-4 w-4 shrink-0 absolute left-3" />
                <span className="truncate text-center flex-1 min-w-0">{getDateDisplayText()}</span>
                <ChevronDown className="size-4 opacity-50 shrink-0 absolute right-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-emerald-200 dark:border-emerald-800">
              <CustomCalendar />
            </PopoverContent>
          </Popover>
          <Button onClick={applyRange} disabled={!dateRangeStart} className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">Aplicar</Button>
        </div>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">
              {appliedDateRangeStart && appliedDateRangeEnd 
                ? (() => {
                    const startDay = new Date(appliedDateRangeStart)
                    startDay.setUTCHours(0, 0, 0, 0)
                    const endDay = new Date(appliedDateRangeEnd)
                    endDay.setUTCHours(0, 0, 0, 0)
                    // Si son el mismo día, mostrar "Potencia del Día", sino "Potencia del Ciclo"
                    return startDay.getTime() === endDay.getTime() ? "Potencia del Día" : "Potencia del Ciclo"
                  })()
                : appliedDateRangeStart
                ? "Potencia del Día"
                : "Potencia Actual"}
            </CardTitle>
            <Zap className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-2 pb-3 px-4">
            <div className="text-2xl font-bold">{currentPowerKw.toFixed(1)} kW</div>
            <p className="text-xs text-muted-foreground mt-1">
              {appliedDateRangeStart || appliedDateRangeEnd ? "Promedio del rango seleccionado" : "Última medición disponible"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Energía del Ciclo</CardTitle>
            <Battery className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-2 pb-3 px-4">
            {machineId === "7" && typeof todayEnergy === 'object' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-2xl font-bold">{todayEnergy.imported.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground mt-1">kWh Importados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{todayEnergy.exported.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground mt-1">kWh Exportados</div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {typeof todayEnergy === 'number' ? todayEnergy.toFixed(1) : (todayEnergy as { imported: number }).imported.toFixed(1)} kWh
                </div>
                <p className="text-xs text-muted-foreground mt-1">Energía acumulada del día</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Costo Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-2 pb-3 px-4">
            <div className="text-2xl font-bold">${estimatedCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Basado en tarifa base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium">Huella de Carbono</CardTitle>
            <Leaf className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-2 pb-3 px-4">
            <div className="text-2xl font-bold">{carbonFootprint.toFixed(2)} kg</div>
            <p className="text-xs text-muted-foreground mt-1">CO₂e equivalente</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      {/* Power Chart - Full Width */}
      <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Monitoreo de Potencia
            </CardTitle>
            <CardDescription>{getRangeLabel()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
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
                  <AreaChart data={powerData}>
                    <defs>
                      <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => (typeof value === 'string' && value.length >= 16) ? value.substring(11,16) : value}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: getYAxisLabel("power"), angle: -90, position: "insideLeft" }}
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
                      formatter={getTooltipFormatter("power")}
                      labelFormatter={(value: string) => {
                        if (typeof value !== 'string') return value as unknown as string
                        const yyyy = value.substring(0, 4)
                        const mm = value.substring(5, 7)
                        const dd = value.substring(8, 10)
                        const hhmm = value.substring(11, 16)
                        return `${dd}/${mm}/${yyyy} ${hhmm}`
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={getDataKey("power")}
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#powerGradient)"
                    />
                    {/* Etiquetas de días */}
                    {(() => {
                      if (!appliedDateRangeStart || !appliedDateRangeEnd) return null
                      const startDay = new Date(appliedDateRangeStart)
                      startDay.setUTCHours(0, 0, 0, 0)
                      const endDay = new Date(appliedDateRangeEnd)
                      endDay.setUTCHours(0, 0, 0, 0)
                      if (startDay.getTime() === endDay.getTime()) return null
                      
                      const dayRanges: Array<{startIdx: number, endIdx: number, date: string}> = []
                      let currentDayStart = 0
                      const firstTimestamp = powerData[0]?.timestamp
                      let lastDay = (typeof firstTimestamp === 'string' && firstTimestamp.length >= 10) ? firstTimestamp.substring(0, 10) : ''
                      
                      powerData.forEach((item, idx) => {
                        const timestamp = item.timestamp
                        if (!timestamp || typeof timestamp !== 'string') return
                        const currentDay = timestamp.substring(0, 10)
                        if (currentDay !== lastDay) {
                          const dd = lastDay.substring(8, 10)
                          const mm = lastDay.substring(5, 7)
                          dayRanges.push({ startIdx: currentDayStart, endIdx: idx - 1, date: `${dd}/${mm}` })
                          currentDayStart = idx
                          lastDay = currentDay
                        }
                      })
                      
                      if (lastDay) {
                        const dd = lastDay.substring(8, 10)
                        const mm = lastDay.substring(5, 7)
                        dayRanges.push({ startIdx: currentDayStart, endIdx: powerData.length - 1, date: `${dd}/${mm}` })
                      }
                      
                      return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                        const midIdx = Math.floor((startIdx + endIdx) / 2)
                        const timestamp = powerData[midIdx]?.timestamp
                        const endTimestamp = powerData[endIdx]?.timestamp
                        
                        return (
                          <React.Fragment key={`day-power-${startIdx}`}>
                            <ReferenceLine
                              x={timestamp}
                              stroke="transparent"
                              label={{
                                value: date,
                                position: 'insideTopRight',
                                fill: 'currentColor',
                                fontSize: 13,
                                fontWeight: 700,
                                offset: 10,
                                className: 'text-gray-900 dark:text-gray-100',
                                style: { textShadow: '0 1px 2px rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }
                              }}
                            />
                            {idx < dayRanges.length - 1 && (
                              <ReferenceLine
                                x={endTimestamp}
                                stroke="#cbd5e1"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                className="dark:stroke-slate-600"
                              />
                            )}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

      {machineId === "7" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-sky-500" />
              Energía Importada vs Exportada
            </CardTitle>
            <CardDescription>{getRangeLabel()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="space-y-3 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ) : kwhPowerData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Sin datos disponibles para el periodo seleccionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kwhPowerData}>
                    <defs>
                      <linearGradient id={`kwhImportedGradient-${machineId ?? "default"}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`kwhExportedGradient-${machineId ?? "default"}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => (typeof value === 'string' && value.length >= 16) ? value.substring(11,16) : value}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Energía (kWh)", angle: -90, position: "insideLeft" }}
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
                      formatter={(value: number, name: string) => {
                        const labelMap: Record<string, string> = {
                          imported: "kWh importados",
                          exported: "kWh exportados"
                        }
                        return [`${Number(value ?? 0).toFixed(1)} kWh`, labelMap[name] ?? name]
                      }}
                      labelFormatter={(value: string) => {
                        if (typeof value !== 'string') return value as unknown as string
                        const yyyy = value.substring(0, 4)
                        const mm = value.substring(5, 7)
                        const dd = value.substring(8, 10)
                        const hhmm = value.substring(11, 16)
                        return `${dd}/${mm}/${yyyy} ${hhmm}`
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      type="monotone"
                      dataKey="imported"
                      name="kWh importados"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fill={`url(#kwhImportedGradient-${machineId ?? "default"})`}
                      dot={false}
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey="exported"
                      name="kWh exportados"
                      stroke="#fb7185"
                      strokeWidth={2}
                      fill={`url(#kwhExportedGradient-${machineId ?? "default"})`}
                      dot={false}
                      connectNulls
                    />
                    {/* Etiquetas de días */}
                    {(() => {
                      if (!appliedDateRangeStart || !appliedDateRangeEnd || kwhPowerData.length === 0) return null
                      const startDay = new Date(appliedDateRangeStart)
                      startDay.setUTCHours(0, 0, 0, 0)
                      const endDay = new Date(appliedDateRangeEnd)
                      endDay.setUTCHours(0, 0, 0, 0)
                      if (startDay.getTime() === endDay.getTime()) return null
                      
                      const dayRanges: Array<{startIdx: number, endIdx: number, date: string}> = []
                      let currentDayStart = 0
                      const firstTimestamp = kwhPowerData[0]?.timestamp
                      if (!firstTimestamp || typeof firstTimestamp !== 'string' || firstTimestamp.length < 10) return null
                      let lastDay = firstTimestamp.substring(0, 10)
                      
                      kwhPowerData.forEach((item, idx) => {
                        if (!item.timestamp || typeof item.timestamp !== 'string' || item.timestamp.length < 10) return
                        const currentDay = item.timestamp.substring(0, 10)
                        if (currentDay !== lastDay) {
                          const dd = lastDay.substring(8, 10)
                          const mm = lastDay.substring(5, 7)
                          dayRanges.push({ startIdx: currentDayStart, endIdx: idx - 1, date: `${dd}/${mm}` })
                          currentDayStart = idx
                          lastDay = currentDay
                        }
                      })
                      
                      if (lastDay && lastDay.length >= 10) {
                        const dd = lastDay.substring(8, 10)
                        const mm = lastDay.substring(5, 7)
                        dayRanges.push({ startIdx: currentDayStart, endIdx: kwhPowerData.length - 1, date: `${dd}/${mm}` })
                      }
                      
                      if (dayRanges.length === 0) return null
                      
                      return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                        const midIdx = Math.floor((startIdx + endIdx) / 2)
                        const timestamp = kwhPowerData[midIdx]?.timestamp
                        const endTimestamp = kwhPowerData[endIdx]?.timestamp
                        
                        return (
                          <React.Fragment key={`day-kwh-${startIdx}`}>
                            <ReferenceLine
                              x={timestamp}
                              stroke="transparent"
                              label={{
                                value: date,
                                position: 'insideTopRight',
                                fill: 'currentColor',
                                fontSize: 13,
                                fontWeight: 700,
                                offset: 10,
                                className: 'text-gray-900 dark:text-gray-100',
                                style: { textShadow: '0 1px 2px rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px' }
                              }}
                            />
                            {idx < dayRanges.length - 1 && (
                              <ReferenceLine
                                x={endTimestamp}
                                stroke="#cbd5e1"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                className="dark:stroke-slate-600"
                              />
                            )}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voltage and Current Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voltage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-blue-500" />
              Monitoreo de Voltaje
            </CardTitle>
            <CardDescription>{getRangeLabel()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
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
                  <AreaChart data={voltageData}>
                    <defs>
                      <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => (typeof value === 'string' && value.length >= 16) ? value.substring(11,16) : value}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: getYAxisLabel("voltage"), angle: -90, position: "insideLeft" }}
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
                      formatter={getTooltipFormatter("voltage")}
                      labelFormatter={(value: string) => {
                        if (typeof value !== 'string') return value as unknown as string
                        const yyyy = value.substring(0, 4)
                        const mm = value.substring(5, 7)
                        const dd = value.substring(8, 10)
                        const hhmm = value.substring(11, 16)
                        return `${dd}/${mm}/${yyyy} ${hhmm}`
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={getDataKey("voltage")}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#voltageGradient)"
                    />
                    {/* Etiquetas de días */}
                    {(() => {
                      if (!appliedDateRangeStart || !appliedDateRangeEnd) return null
                      const startDay = new Date(appliedDateRangeStart)
                      startDay.setUTCHours(0, 0, 0, 0)
                      const endDay = new Date(appliedDateRangeEnd)
                      endDay.setUTCHours(0, 0, 0, 0)
                      if (startDay.getTime() === endDay.getTime()) return null
                      
                      const dayRanges: Array<{startIdx: number, endIdx: number, date: string}> = []
                      let currentDayStart = 0
                      const firstTimestamp = voltageData[0]?.timestamp
                      let lastDay = (typeof firstTimestamp === 'string' && firstTimestamp.length >= 10) ? firstTimestamp.substring(0, 10) : ''
                      
                      voltageData.forEach((item, idx) => {
                        const timestamp = item.timestamp
                        if (!timestamp || typeof timestamp !== 'string') return
                        const currentDay = timestamp.substring(0, 10)
                        if (currentDay !== lastDay) {
                          const dd = lastDay.substring(8, 10)
                          const mm = lastDay.substring(5, 7)
                          dayRanges.push({ startIdx: currentDayStart, endIdx: idx - 1, date: `${dd}/${mm}` })
                          currentDayStart = idx
                          lastDay = currentDay
                        }
                      })
                      
                      if (lastDay) {
                        const dd = lastDay.substring(8, 10)
                        const mm = lastDay.substring(5, 7)
                        dayRanges.push({ startIdx: currentDayStart, endIdx: voltageData.length - 1, date: `${dd}/${mm}` })
                      }
                      
                      return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                        const midIdx = Math.floor((startIdx + endIdx) / 2)
                        const timestamp = voltageData[midIdx]?.timestamp
                        const endTimestamp = voltageData[endIdx]?.timestamp
                        
                        return (
                          <React.Fragment key={`day-voltage-${startIdx}`}>
                            <ReferenceLine
                              x={timestamp}
                              stroke="transparent"
                              label={{
                                value: date,
                                position: 'insideTop',
                                fill: 'currentColor',
                                fontSize: 12,
                                fontWeight: 700,
                                offset: 5,
                                className: 'text-gray-900 dark:text-gray-100',
                                style: { textShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                              }}
                            />
                            {idx < dayRanges.length - 1 && (
                              <ReferenceLine
                                x={endTimestamp}
                                stroke="#cbd5e1"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                className="dark:stroke-slate-600"
                              />
                            )}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Monitoreo de Corriente
            </CardTitle>
            <CardDescription>{getRangeLabel()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {isLoading ? (
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
                  <AreaChart data={currentData}>
                    <defs>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => (typeof value === 'string' && value.length >= 16) ? value.substring(11,16) : value}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: getYAxisLabel("current"), angle: -90, position: "insideLeft" }}
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
                      formatter={currentTooltipFormatter}
                      labelFormatter={(value: string) => {
                        if (typeof value !== 'string') return value as unknown as string
                        const yyyy = value.substring(0, 4)
                        const mm = value.substring(5, 7)
                        const dd = value.substring(8, 10)
                        const hhmm = value.substring(11, 16)
                        return `${dd}/${mm}/${yyyy} ${hhmm}`
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      type="monotone"
                      dataKey={getDataKey("current")}
                      name="Corriente equivalente"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="url(#currentGradient)"
                    />
                    {hasLine1 && (
                      <Line
                        type="monotone"
                        dataKey="line1"
                        name="Línea 1"
                        stroke="#ef4444"
                        strokeWidth={1.6}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {hasLine2 && (
                      <Line
                        type="monotone"
                        dataKey="line2"
                        name="Línea 2"
                        stroke="#3b82f6"
                        strokeWidth={1.6}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {hasLine3 && (
                      <Line
                        type="monotone"
                        dataKey="line3"
                        name="Línea 3"
                        stroke="#f59e0b"
                        strokeWidth={1.6}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {/* Etiquetas de días */}
                    {(() => {
                      if (!appliedDateRangeStart || !appliedDateRangeEnd) return null
                      const startDay = new Date(appliedDateRangeStart)
                      startDay.setUTCHours(0, 0, 0, 0)
                      const endDay = new Date(appliedDateRangeEnd)
                      endDay.setUTCHours(0, 0, 0, 0)
                      if (startDay.getTime() === endDay.getTime()) return null
                      
                      const dayRanges: Array<{startIdx: number, endIdx: number, date: string}> = []
                      let currentDayStart = 0
                      const firstTimestamp = currentData[0]?.timestamp
                      let lastDay = (typeof firstTimestamp === 'string' && firstTimestamp.length >= 10) ? firstTimestamp.substring(0, 10) : ''
                      
                      currentData.forEach((item, idx) => {
                        const timestamp = item.timestamp
                        if (!timestamp || typeof timestamp !== 'string') return
                        const currentDay = timestamp.substring(0, 10)
                        if (currentDay !== lastDay) {
                          const dd = lastDay.substring(8, 10)
                          const mm = lastDay.substring(5, 7)
                          dayRanges.push({ startIdx: currentDayStart, endIdx: idx - 1, date: `${dd}/${mm}` })
                          currentDayStart = idx
                          lastDay = currentDay
                        }
                      })
                      
                      if (lastDay) {
                        const dd = lastDay.substring(8, 10)
                        const mm = lastDay.substring(5, 7)
                        dayRanges.push({ startIdx: currentDayStart, endIdx: currentData.length - 1, date: `${dd}/${mm}` })
                      }
                      
                      return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                        const midIdx = Math.floor((startIdx + endIdx) / 2)
                        const timestamp = currentData[midIdx]?.timestamp
                        const endTimestamp = currentData[endIdx]?.timestamp
                        
                        return (
                          <React.Fragment key={`day-current-${startIdx}`}>
                            <ReferenceLine
                              x={timestamp}
                              stroke="transparent"
                              label={{
                                value: date,
                                position: 'insideTop',
                                fill: 'currentColor',
                                fontSize: 12,
                                fontWeight: 700,
                                offset: 5,
                                className: 'text-gray-900 dark:text-gray-100',
                                style: { textShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                              }}
                            />
                            {idx < dayRanges.length - 1 && (
                              <ReferenceLine
                                x={endTimestamp}
                                stroke="#cbd5e1"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                className="dark:stroke-slate-600"
                              />
                            )}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Power Chart - Solo si hay rango de fechas */}
      {appliedDateRangeStart && appliedDateRangeEnd && dailyPowerChartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-work-sans">Potencia Total por Día</CardTitle>
                <CardDescription>
                  {`Rango: ${format(appliedDateRangeStart, "dd/MM/yyyy", { locale: es })} - ${format(appliedDateRangeEnd, "dd/MM/yyyy", { locale: es })}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1" />
                  kWh Importados
                </Badge>
                {machineId === "7" && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-1" />
                    kWh Exportados
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPowerChartData}>
                    <defs>
                      <linearGradient id="importedGradient-machine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                      </linearGradient>
                      <linearGradient id="exportedGradient-machine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: string) => {
                        // Formato: YYYY-MM-DD → DD/MM
                        const parts = value.split('-')
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}/${parts[0]}`
                        }
                        return value
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "kWh", angle: -90, position: "insideLeft" }}
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
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          'imported': 'Importados',
                          'exported': 'Exportados'
                        }
                        return [`${Number(value ?? 0).toFixed(1)} kWh`, labels[name] || name]
                      }}
                      labelFormatter={(value: string) => {
                        const parts = value.split('-')
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}/${parts[0]}`
                        }
                        return value
                      }}
                    />
                    <Bar
                      dataKey="imported"
                      fill="url(#importedGradient-machine)"
                      stackId="stack"
                      radius={machineId === "7" ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      name="imported"
                    />
                    {machineId === "7" && (
                      <Bar
                        dataKey="exported"
                        fill="url(#exportedGradient-machine)"
                        stackId="stack"
                        radius={[4, 4, 0, 0]}
                        name="exported"
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
