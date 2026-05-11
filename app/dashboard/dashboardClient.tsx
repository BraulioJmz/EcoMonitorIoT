"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, Brush, ReferenceLine } from "recharts"
import {
  Zap,
  Battery,
  DollarSign,
  Leaf,
  RefreshCw,
  CalendarIcon,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Activity,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import html2canvas from "html2canvas-pro"
import jsPDF from "jspdf"
import { PDFReportTemplate } from "@/components/pdf-report-template"


interface KPICardProps {
  title: string
  value: number | { imported: number; exported: number }
  unit: string
  change: number
  trend: "up" | "down"
  icon: React.ElementType
  isLoading?: boolean
  accent?: "emerald" | "sky" | "amber" | "violet" | "indigo"
}

const DEFAULT_TIME_OPTION = "default"
const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`)

function KPICard({ title, value, unit, change, trend, icon: Icon, isLoading, accent = "emerald" }: KPICardProps) {
  const accentBg = accent === "sky" ? "from-sky-400/20 to-sky-400/5" : accent === "amber" ? "from-amber-400/20 to-amber-400/5" : accent === "violet" ? "from-violet-400/20 to-violet-400/5" : accent === "indigo" ? "from-indigo-400/20 to-indigo-400/5" : "from-emerald-400/20 to-emerald-400/5"
  const accentText = accent === "sky" ? "text-sky-600 dark:text-sky-400" : accent === "amber" ? "text-amber-600 dark:text-amber-400" : accent === "violet" ? "text-violet-600 dark:text-violet-400" : accent === "indigo" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400"
  const borderColor = accent === 'sky' ? 'rgba(56, 189, 248, 0.3)' : accent === 'amber' ? 'rgba(251, 191, 36, 0.3)' : accent === 'violet' ? 'rgba(167, 139, 250, 0.3)' : accent === 'indigo' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'
  const isDualValue = typeof value === 'object' && 'imported' in value && 'exported' in value
  if (isLoading) {
    return (
      <Card className="h-[180px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent className="flex-1 flex items-center w-full pt-0">
          {typeof value === 'object' && 'imported' in value && 'exported' in value ? (
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="min-w-0">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="min-w-0">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ) : (
            <div>
              <Skeleton className="h-10 w-32" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  return (
    <div className={`group relative rounded-xl transition-all duration-300 hover:shadow-[0_10px_30px_-12px_hsl(var(--primary)/.35)]`}>
      <Card className="h-[180px] flex flex-col relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:-translate-y-0.5" style={{ borderColor }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.55] bg-[radial-gradient(80%_60%_at_0%_0%,hsl(var(--card-foreground)/0.04),transparent_60%)] dark:bg-[radial-gradient(80%_60%_at_0%_0%,hsl(var(--card-foreground)/0.07),transparent_60%)]" />
        <div className="pointer-events-none absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,hsl(var(--primary)/.06)_120deg,transparent_240deg)]" />
        <CardHeader className="relative z-1 flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
          <CardTitle className={`text-[11px] font-medium text-muted-foreground tracking-[0.08em] ${title === "kg de CO2e" ? "" : "uppercase"}`}>
            {title === "kg de CO2e" ? "KG DE CO2e" : title}
          </CardTitle>
          <div className={`size-10 rounded-full bg-linear-to-br ${accentBg} shadow-[0_6px_22px_-10px_hsl(var(--primary)/.55)] flex items-center justify-center transition-all duration-300 group-hover:scale-105`}>
            <Icon className={`h-4 w-4 ${accentText} drop-shadow-[0_1px_4px_rgba(0,0,0,.15)]`} />
          </div>
        </CardHeader>
        <CardContent className="relative z-1 flex-1 flex items-center w-full pt-0">
          {typeof value === 'object' && 'imported' in value && 'exported' in value ? (
            <div className="grid grid-cols-2 gap-6 w-full px-2">
              <div className="min-w-0 flex flex-col justify-center space-y-1.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-3xl font-semibold font-work-sans tracking-tight leading-none">
                    {value.imported.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Importados</span>
              </div>
              <div className="min-w-0 flex flex-col justify-center space-y-1.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-3xl font-semibold font-work-sans tracking-tight leading-none">
                    {value.exported.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Exportados</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start justify-center">
              <div className="text-3xl sm:text-4xl font-semibold font-work-sans tracking-tight leading-none">
                {typeof value === 'number' ? value.toLocaleString("es-ES", { maximumFractionDigits: 1 }) : '0'}
                <span className="text-sm sm:text-base font-normal text-muted-foreground ml-2">{unit}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardClient() {
  const searchParams = useSearchParams()
  const machineId = searchParams?.get("machineId") || undefined
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
  const [hasInitializedMachines, setHasInitializedMachines] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [realtimeMachines, setRealtimeMachines] = useState<Array<{ id: string; name: string }>>([])
  const [realtimeDate, setRealtimeDate] = useState<Date | null>(null)
  const [voltageChartData, setVoltageChartData] = useState<Array<{ timestamp: string; voltage: number }>>([])
  const [currentChartData, setCurrentChartData] = useState<Array<{ timestamp: string; current: number; line1?: number | null; line2?: number | null; line3?: number | null }>>([])
  const [dailyPowerChartData, setDailyPowerChartData] = useState<Array<{ day: string; total_kwh: number; imported: number; exported: number }>>([])
  const [dailyPowerByHourData, setDailyPowerByHourData] = useState<{ data: Array<any>; days: string[] }>({ data: [], days: [] })
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined)
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined)
  const [brushStartIndexPower, setBrushStartIndexPower] = useState<number | undefined>(undefined)
  const [brushEndIndexPower, setBrushEndIndexPower] = useState<number | undefined>(undefined)
  const [brushStartIndexDailyPower, setBrushStartIndexDailyPower] = useState<number | undefined>(undefined)
  const [brushEndIndexDailyPower, setBrushEndIndexDailyPower] = useState<number | undefined>(undefined)
  const [brushResetKey, setBrushResetKey] = useState(0)
  const [brushResetKeyPower, setBrushResetKeyPower] = useState(0)
  const [brushResetKeyDailyPower, setBrushResetKeyDailyPower] = useState(0)
  const [currentPower, setCurrentPower] = useState(0)
  const [cycleEnergy, setCycleEnergy] = useState<{ imported: number; exported: number }>({ imported: 0, exported: 0 })
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [co2Emissions, setCo2Emissions] = useState(0)
  const [powerFactor, setPowerFactor] = useState(0)
  const [alertsCount, setAlertsCount] = useState(0)
  const [dateRangeLimits, setDateRangeLimits] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null })
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(undefined)
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined)
  const [appliedDateRangeStart, setAppliedDateRangeStart] = useState<Date | undefined>(undefined)
  const [appliedDateRangeEnd, setAppliedDateRangeEnd] = useState<Date | undefined>(undefined)
  const [dateRangeStartTime, setDateRangeStartTime] = useState<"default" | string>("default")
  const [dateRangeEndTime, setDateRangeEndTime] = useState<"default" | string>("default")
  const [appliedDateRangeStartTime, setAppliedDateRangeStartTime] = useState<"default" | string>("default")
  const [appliedDateRangeEndTime, setAppliedDateRangeEndTime] = useState<"default" | string>("default")
  const [workHoursConfig, setWorkHoursConfig] = useState<{ startMinutes: number; endMinutes: number }>({ startMinutes: 450, endMinutes: 1170 })
  const [appliedSelectedMachines, setAppliedSelectedMachines] = useState<string[]>([])
  const [powerChartData, setPowerChartData] = useState<Array<{ timestamp: string; power: number }>>([])
  const [calculationMode, setCalculationMode] = useState<"full_day" | "custom_time" | "total_consumption">("total_consumption")
  const [appliedCalculationMode, setAppliedCalculationMode] = useState<"full_day" | "custom_time" | "total_consumption">("total_consumption")
  const [showReportNameDialog, setShowReportNameDialog] = useState(false)
  const [customReportName, setCustomReportName] = useState("")
  const [useCustomReportName, setUseCustomReportName] = useState(false)

  const applyTimeOptionToDate = (date: Date, timeOption: string | undefined, mode: "start" | "end") => {
    const result = new Date(date)

    if (!timeOption || timeOption === DEFAULT_TIME_OPTION) {
      if (mode === "start") {
        // Usar horario de configuración en lugar de 00:00
        const hours = Math.floor(workHoursConfig.startMinutes / 60)
        const minutes = workHoursConfig.startMinutes % 60
        result.setUTCHours(hours, minutes, 0, 0)
      } else {
        // Usar horario de configuración en lugar de 23:59
        const hours = Math.floor(workHoursConfig.endMinutes / 60)
        const minutes = workHoursConfig.endMinutes % 60
        result.setUTCHours(hours, minutes, 59, 999)
      }
      return result
    }

    const [hoursPart, minutesPart] = timeOption.split(":")
    const hours = Number.parseInt(hoursPart ?? "0", 10)
    const minutes = Number.parseInt(minutesPart ?? "0", 10)

    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      result.setUTCHours(hours, minutes, mode === "end" ? 59 : 0, mode === "end" ? 999 : 0)
    } else if (mode === "start") {
      const h = Math.floor(workHoursConfig.startMinutes / 60)
      const m = workHoursConfig.startMinutes % 60
      result.setUTCHours(h, m, 0, 0)
    } else {
      const h = Math.floor(workHoursConfig.endMinutes / 60)
      const m = workHoursConfig.endMinutes % 60
      result.setUTCHours(h, m, 59, 999)
    }

    return result
  }

  const buildDateFilterParams = ({
    startDate,
    endDate,
    startTimeOption,
    endTimeOption,
    machineId: machineIdOverride,
    includeMachineId = true,
    machineIds,
    calcMode,
  }: {
    startDate?: Date
    endDate?: Date
    startTimeOption?: string
    endTimeOption?: string
    machineId?: string
    includeMachineId?: boolean
    machineIds?: string[]
    calcMode?: "full_day" | "custom_time" | "total_consumption"
  }) => {
    const params = new URLSearchParams()
    let computedStart: Date | undefined
    let computedEnd: Date | undefined

    if (startDate) {
      computedStart = applyTimeOptionToDate(startDate, startTimeOption, "start")
      const effectiveEndDate = endDate ?? startDate
      const effectiveEndTimeOption = endDate
        ? endTimeOption
        : endTimeOption ?? startTimeOption
      computedEnd = applyTimeOptionToDate(effectiveEndDate, effectiveEndTimeOption, "end")

      params.set("startDate", computedStart.toISOString())
      params.set("endDate", computedEnd.toISOString())
    }

    if (includeMachineId) {
      const machineParam = machineIdOverride ?? machineId
      if (machineParam) {
        params.set("machineId", machineParam)
      }
    }

    if (machineIds && machineIds.length > 0) {
      params.set("machineIds", machineIds.join(","))
    }

    if (calcMode) {
      params.set("calculationMode", calcMode)
    }

    return {
      queryString: params.toString() ? `?${params.toString()}` : "",
      startDateTime: computedStart,
      endDateTime: computedEnd,
      hasRange: Boolean(startDate && endDate),
    }
  }

  const formatDateWithOptionalTime = (date?: Date, timeOption?: string) => {
    if (!date) return undefined
    const base = format(date, "dd/MM/yyyy", { locale: es })
    if (!timeOption || timeOption === DEFAULT_TIME_OPTION) return base
    return `${base} ${timeOption}`
  }

  const composeRangeText = (
    startDate?: Date,
    endDate?: Date,
    startTimeOption?: string,
    endTimeOption?: string
  ) => {
    const startLabel = startDate ? formatDateWithOptionalTime(startDate, startTimeOption) : undefined
    const endLabel = endDate ? formatDateWithOptionalTime(endDate, endTimeOption) : undefined

    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
    if (startLabel && !endDate && endTimeOption && endTimeOption !== DEFAULT_TIME_OPTION) {
      return `${startLabel} · Hasta ${endTimeOption}`
    }
    if (startLabel) return startLabel
    if (endLabel) return endLabel
    return undefined
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Potencia actual: si hay machineId, tomar última medición de branch_br0[i]_avg5m
        if (machineId) {
          const powerResponse = await fetch(`/api/dashboard/branch-current-power?machineId=${machineId}`)
          const currentPowerData = await powerResponse.json()
          setCurrentPower(currentPowerData?.data?.wattsKw ?? 0)
        } else {
          const powerResponse = await fetch(`/api/dashboard/current-power`)
          const currentPowerData = await powerResponse.json()
          setCurrentPower(currentPowerData.watts || 0)
        }

        const energyResponse = await fetch(`/api/dashboard/cycle-energy${machineId ? `?machineId=${machineId}` : ''}`)
        const energyData = await energyResponse.json()
        setCycleEnergy({
          imported: energyData.accumulated_kwh_imported || 0,
          exported: energyData.accumulated_kwh_exported || 0
        })

        const costResponse = await fetch(`/api/dashboard/estimated-cost${machineId ? `?machineId=${machineId}` : ''}`)
        const costData = await costResponse.json()
        setEstimatedCost(costData.estimatedCost || 0)

        const co2Response = await fetch(`/api/dashboard/co2-emissions${machineId ? `?machineId=${machineId}` : ''}`)
        const co2Data = await co2Response.json()
        setCo2Emissions(co2Data.co2_kg || 0)

        const powerFactorResponse = await fetch('/api/dashboard/power-factor')
        const powerFactorData = await powerFactorResponse.json()
        setPowerFactor(powerFactorData.power_factor || 0)

        const alertsResponse = await fetch('/api/dashboard/alerts-count')
        const alertsData = await alertsResponse.json()
        setAlertsCount(alertsData.count || 0)

        const dateRangeResponse = await fetch(`/api/dashboard/date-range${machineId ? `?machineId=${machineId}` : ''}`)
        const dateRangeData = await dateRangeResponse.json()
        if (dateRangeData.startDate && dateRangeData.endDate) {
          setDateRangeLimits({ start: new Date(dateRangeData.startDate), end: new Date(dateRangeData.endDate) })
        }
        
        // Resetear zoom cuando se cargan nuevos datos iniciales - establecer a valores por defecto después de que se carguen los datos
        setTimeout(() => {
          setBrushStartIndex(undefined)
          setBrushEndIndex(undefined)
          setBrushStartIndexPower(undefined)
          setBrushEndIndexPower(undefined)
          setBrushResetKey(prev => prev + 1)
          setBrushResetKeyPower(prev => prev + 1)
        }, 100)

        const voltageDataResponse = await fetch('/api/dashboard/voltage-data')
        const voltageDataResult = await voltageDataResponse.json()
        if (voltageDataResult.data) setVoltageChartData(voltageDataResult.data)

        const currentDataResponse = await fetch('/api/dashboard/current-data')
        const currentDataResult = await currentDataResponse.json()
        if (currentDataResult.data) setCurrentChartData(currentDataResult.data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      }
    }
    fetchDashboardData()
  }, [])

  const fetchKPIsWithDateRange = async (
    startDate?: Date,
    endDate?: Date,
    startTimeOption?: string,
    endTimeOption?: string,
    machineIdsOverride?: string[],
    calcModeOverride?: "full_day" | "custom_time" | "total_consumption"
  ) => {
    try {
      setIsLoading(true)
      const machinesForQuery = machineIdsOverride ?? appliedSelectedMachines
      const calcModeToUse = calcModeOverride ?? appliedCalculationMode
      const { queryString, startDateTime, endDateTime } = buildDateFilterParams({
        startDate,
        endDate,
        startTimeOption,
        endTimeOption,
        machineIds: machinesForQuery,
        calcMode: calcModeToUse,
      })

      const powerResponse = await fetch(`/api/dashboard/current-power${queryString}`)
      const currentPowerData = await powerResponse.json()
      setCurrentPower(currentPowerData.watts || 0)

      const energyResponse = await fetch(`/api/dashboard/cycle-energy${queryString}`)
      const energyData = await energyResponse.json()
      setCycleEnergy({
        imported: energyData.accumulated_kwh_imported || 0,
        exported: energyData.accumulated_kwh_exported || 0
      })

      const costResponse = await fetch(`/api/dashboard/estimated-cost${queryString}`)
      const costData = await costResponse.json()
      setEstimatedCost(costData.estimatedCost || 0)

      const co2Response = await fetch(`/api/dashboard/co2-emissions${queryString}`)
      const co2Data = await co2Response.json()
      setCo2Emissions(co2Data.co2_kg || 0)

      const powerFactorResponse = await fetch(`/api/dashboard/power-factor${queryString}`)
      const powerFactorData = await powerFactorResponse.json()
      setPowerFactor(powerFactorData.power_factor || 0)

      const alertsResponse = await fetch(`/api/dashboard/alerts-count${queryString}`)
      const alertsData = await alertsResponse.json()
      setAlertsCount(alertsData.count || 0)

      // Construir query string con machineIds si existen
      const powerDataQueryString = queryString + (machinesForQuery.length > 0 ? `${queryString ? '&' : '?'}machineIds=${machinesForQuery.join(',')}` : '')
      const powerDataResponse = await fetch(`/api/dashboard/power-data${powerDataQueryString}`)
      const powerDataResult = await powerDataResponse.json()
      if (powerDataResult.data) {
        setPowerChartData(powerDataResult.data)
        // Resetear zoom cuando se aplica un filtro de fecha
        setTimeout(() => {
          setBrushStartIndexPower(undefined)
          setBrushEndIndexPower(undefined)
          setBrushResetKeyPower(prev => prev + 1)
        }, 100)
      }

      // Resetear zoom cuando se aplica un filtro de fecha
      setTimeout(() => {
        setBrushStartIndex(undefined)
        setBrushEndIndex(undefined)
        setBrushResetKey(prev => prev + 1)
      }, 100)

      const voltageDataResponse = await fetch(`/api/dashboard/voltage-data${queryString}`)
      const voltageDataResult = await voltageDataResponse.json()
      if (voltageDataResult.data) setVoltageChartData(voltageDataResult.data)

      const currentDataResponse = await fetch(`/api/dashboard/current-data${queryString}`)
      const currentDataResult = await currentDataResponse.json()
      if (currentDataResult.data) setCurrentChartData(currentDataResult.data)

      // Obtener datos de potencia por día solo si hay un rango (startDate y endDate diferentes)
      if (startDate && endDate && startDateTime && endDateTime) {
        const startDay = new Date(startDate)
        startDay.setUTCHours(0, 0, 0, 0)
        const endDay = new Date(endDate)
        endDay.setUTCHours(0, 0, 0, 0)

        // Solo obtener datos si el rango tiene más de un día
        if (startDay.getTime() !== endDay.getTime()) {
          const params = new URLSearchParams({
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
          })
          if (machinesForQuery.length > 0) {
            params.set('machineIds', machinesForQuery.join(','))
          }
          const dailyPowerResponse = await fetch(`/api/dashboard/daily-power-totals?${params.toString()}`)
          const dailyPowerResult = await dailyPowerResponse.json()
          if (dailyPowerResult.data) {
            setDailyPowerChartData(dailyPowerResult.data)
          }

          // Obtener datos por hora para gráfica de días apilados
          const dailyPowerByHourResponse = await fetch(`/api/dashboard/daily-power-by-hour?${params.toString()}`)
          const dailyPowerByHourResult = await dailyPowerByHourResponse.json()
          if (dailyPowerByHourResult.data && dailyPowerByHourResult.days) {
            setDailyPowerByHourData({ data: dailyPowerByHourResult.data, days: dailyPowerByHourResult.days })
            // Resetear zoom cuando se cargan nuevos datos
            setBrushStartIndexDailyPower(undefined)
            setBrushEndIndexDailyPower(undefined)
            setBrushResetKeyDailyPower(prev => prev + 1)
          }
        } else {
          // Si es un solo día, limpiar los datos
          setDailyPowerChartData([])
          setDailyPowerByHourData({ data: [], days: [] })
          // Resetear zoom cuando se limpian los datos
          setBrushStartIndexDailyPower(undefined)
          setBrushEndIndexDailyPower(undefined)
          setBrushResetKeyDailyPower(prev => prev + 1)
        }
      } else {
        // Si no hay rango, limpiar los datos
        setDailyPowerChartData([])
        setDailyPowerByHourData({ data: [], days: [] })
        // Resetear zoom cuando se limpian los datos
        setBrushStartIndexDailyPower(undefined)
        setBrushEndIndexDailyPower(undefined)
        setBrushResetKeyDailyPower(prev => prev + 1)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 1500); return () => clearTimeout(t) }, [])

  // Cargar configuración de horario laboral
  useEffect(() => {
    const fetchWorkHours = async () => {
      try {
        const response = await fetch('/api/settings/chart-time-range')
        if (response.ok) {
          const data = await response.json()
          const startMinutes = data.hora_inicio_minutos ?? 450
          const endMinutes = data.hora_fin_minutos ?? 1170
          setWorkHoursConfig({ startMinutes, endMinutes })
          
          // Convertir minutos a formato HH:MM para los selectores
          const startHours = Math.floor(startMinutes / 60)
          const startMins = startMinutes % 60
          const endHours = Math.floor(endMinutes / 60)
          const endMins = endMinutes % 60
          
          const startTimeStr = `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`
          const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
          
          // Establecer los valores por defecto basados en la configuración
          setDateRangeStartTime(startTimeStr)
          setDateRangeEndTime(endTimeStr)
        }
      } catch (error) {
        console.error('Error fetching work hours config:', error)
      }
    }

    fetchWorkHours()
  }, [])

  // Cargar datos de potencia cuando se apliquen máquinas seleccionadas
  useEffect(() => {
    const fetchPowerData = async () => {
      console.log('🔄 fetchPowerData ejecutado:', {
        appliedSelectedMachines: appliedSelectedMachines.length,
        hasInitializedMachines,
        appliedDateRangeStart,
        appliedDateRangeEnd
      })
      
      // Si no hay máquinas seleccionadas y aún no se han inicializado, esperar
      if (appliedSelectedMachines.length === 0) {
        if (!hasInitializedMachines) {
          console.log('⏳ Esperando a que se inicialicen las máquinas...')
          return
        } else {
          console.log('⚠️ No hay máquinas seleccionadas, limpiando gráfica')
          setPowerChartData([])
          return
        }
      }

      try {
        // Construir query string solo con fechas si existen
        let queryString = ''
        
        if (appliedDateRangeStart || appliedDateRangeEnd) {
          const dateParams = buildDateFilterParams({
            startDate: appliedDateRangeStart,
            endDate: appliedDateRangeEnd,
            startTimeOption: appliedDateRangeStartTime,
            endTimeOption: appliedDateRangeEndTime,
            includeMachineId: false,
            calcMode: appliedCalculationMode,
          })
          queryString = dateParams.queryString
        }
        
        // Agregar machineIds al query string
        const machineIdsParam = appliedSelectedMachines.length > 0 
          ? `machineIds=${appliedSelectedMachines.join(',')}` 
          : ''
        
        if (machineIdsParam) {
          queryString = queryString 
            ? `${queryString}&${machineIdsParam}` 
            : `?${machineIdsParam}`
        }
        
        // Agregar calculationMode si no hay fechas aplicadas
        if (!appliedDateRangeStart && !appliedDateRangeEnd) {
          const calcModeParam = `calculationMode=${appliedCalculationMode}`
          queryString = queryString 
            ? `${queryString}&${calcModeParam}` 
            : `?${calcModeParam}`
        }
        
        console.log('📡 Fetching power data:', `/api/dashboard/power-data${queryString}`)
        const powerDataResponse = await fetch(`/api/dashboard/power-data${queryString}`)
        const powerDataResult = await powerDataResponse.json()
        
        console.log('✅ Power data recibida:', powerDataResult.data?.length || 0, 'puntos')
        
        if (powerDataResult.data && powerDataResult.data.length > 0) {
          console.log('✅ Seteando datos de gráfica:', powerDataResult.data.length, 'puntos')
          setPowerChartData(powerDataResult.data)
          // Resetear zoom cuando se cargan nuevos datos
          setTimeout(() => {
            setBrushStartIndexPower(undefined)
            setBrushEndIndexPower(undefined)
            setBrushResetKeyPower(prev => prev + 1)
          }, 100)
        } else {
          // Si la API no devolvió datos, establecer array vacío
          console.log('⚠️ La API no devolvió datos o devolvió array vacío')
          setPowerChartData([])
        }
      } catch (error) {
        console.error('❌ Error fetching power data:', error)
        setPowerChartData([])
      }
    }

    fetchPowerData()
  }, [appliedSelectedMachines, appliedDateRangeStart, appliedDateRangeEnd, appliedDateRangeStartTime, appliedDateRangeEndTime, hasInitializedMachines, appliedCalculationMode])

  // Fetch realtime data
  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        // Incluir fechas aplicadas si existen
        let url = '/api/dashboard/realtime-power-data'
        const realtimeParams = buildDateFilterParams({
          startDate: appliedDateRangeStart,
          endDate: appliedDateRangeEnd,
          startTimeOption: appliedDateRangeStartTime,
          endTimeOption: appliedDateRangeEndTime,
          includeMachineId: false,
        })

        if (realtimeParams.queryString) {
          url += realtimeParams.queryString
        }
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const result = await response.json()
        
        
        
        if (result.data) {
          setChartData(result.data)
        } else {
          console.warn('No se recibió data en la respuesta')
          setChartData([])
        }
        
        if (result.date) {
          const parsedDate = new Date(result.date)
          setRealtimeDate(parsedDate)
        } else {
          console.warn('No se recibió fecha en la respuesta')
          setRealtimeDate(null)
        }
        
        if (result.machines) {
          setRealtimeMachines(result.machines)
          // Solo seleccionar todas las máquinas automáticamente en la primera carga
          if (!hasInitializedMachines && result.machines.length > 0) {
            const machineIds = result.machines.map((m: { id: string }) => m.id)
            setSelectedMachines(machineIds)
            setAppliedSelectedMachines(machineIds)
            setHasInitializedMachines(true)
          }
        }
      } catch (error) {
        console.error('Error fetching realtime data:', error)
        // No actualizar el estado en caso de error para mantener la UI estable
      }
    }

    fetchRealtimeData()
    // Actualizar cada minuto
    const interval = setInterval(fetchRealtimeData, 60000)
    return () => clearInterval(interval)
  }, [hasInitializedMachines, appliedDateRangeStart, appliedDateRangeEnd, appliedDateRangeStartTime, appliedDateRangeEndTime])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Recargar KPIs y gráficas con el rango de fechas actual si existe
      if (dateRangeStart && dateRangeEnd) {
        await fetchKPIsWithDateRange(dateRangeStart, dateRangeEnd, dateRangeStartTime, dateRangeEndTime, undefined, appliedCalculationMode)
      } else if (dateRangeStart) {
        await fetchKPIsWithDateRange(dateRangeStart, undefined, dateRangeStartTime, dateRangeEndTime, undefined, appliedCalculationMode)
      } else if (!machineId && appliedSelectedMachines.length > 0) {
        await fetchKPIsWithDateRange(undefined, undefined, undefined, undefined, appliedSelectedMachines, appliedCalculationMode)
      } else {
        // Si no hay rango de fechas y no hay selección aplicada (o hay machineId), recargar datos base
        if (machineId) {
          const powerResponse = await fetch(`/api/dashboard/branch-current-power?machineId=${machineId}`)
          const currentPowerData = await powerResponse.json()
          setCurrentPower(currentPowerData?.data?.wattsKw ?? 0)
        } else {
          const powerResponse = await fetch(`/api/dashboard/current-power`)
          const currentPowerData = await powerResponse.json()
          setCurrentPower(currentPowerData.watts || 0)
        }

        const energyResponse = await fetch(`/api/dashboard/cycle-energy${machineId ? `?machineId=${machineId}` : ''}`)
        const energyData = await energyResponse.json()
        setCycleEnergy({
          imported: energyData.accumulated_kwh_imported || 0,
          exported: energyData.accumulated_kwh_exported || 0
        })

        const costResponse = await fetch(`/api/dashboard/estimated-cost${machineId ? `?machineId=${machineId}` : ''}`)
        const costData = await costResponse.json()
        setEstimatedCost(costData.estimatedCost || 0)

        const co2Response = await fetch(`/api/dashboard/co2-emissions${machineId ? `?machineId=${machineId}` : ''}`)
        const co2Data = await co2Response.json()
        setCo2Emissions(co2Data.co2_kg || 0)

        const powerFactorResponse = await fetch('/api/dashboard/power-factor')
        const powerFactorData = await powerFactorResponse.json()
        setPowerFactor(powerFactorData.power_factor || 0)

        // Construir query string con machineIds si existen
        const powerDataQueryParams = appliedSelectedMachines.length > 0 
          ? `?machineIds=${appliedSelectedMachines.join(',')}` 
          : ''
        const powerDataResponse = await fetch(`/api/dashboard/power-data${powerDataQueryParams}`)
        const powerDataResult = await powerDataResponse.json()
        if (powerDataResult.data) setPowerChartData(powerDataResult.data)
        
        // Resetear zoom cuando se hace refresh
        setTimeout(() => {
          setBrushStartIndex(undefined)
          setBrushEndIndex(undefined)
          setBrushStartIndexPower(undefined)
          setBrushEndIndexPower(undefined)
          setBrushResetKey(prev => prev + 1)
          setBrushResetKeyPower(prev => prev + 1)
        }, 100)

        // Construir URL para voltage-data con máquinas seleccionadas
        let voltageUrl = '/api/dashboard/voltage-data'
        const voltageParams = new URLSearchParams()
        if (appliedSelectedMachines.length > 0) {
          voltageParams.append('machineIds', appliedSelectedMachines.join(','))
        }
        if (voltageParams.toString()) {
          voltageUrl += '?' + voltageParams.toString()
        }
        
        const voltageDataResponse = await fetch(voltageUrl)
        const voltageDataResult = await voltageDataResponse.json()
        if (voltageDataResult.data) setVoltageChartData(voltageDataResult.data)

        // Construir URL para current-data con máquinas seleccionadas
        let currentUrl = '/api/dashboard/current-data'
        const currentParams = new URLSearchParams()
        if (appliedSelectedMachines.length > 0) {
          currentParams.append('machineIds', appliedSelectedMachines.join(','))
        }
        if (currentParams.toString()) {
          currentUrl += '?' + currentParams.toString()
        }
        
        const currentDataResponse = await fetch(currentUrl)
        const currentDataResult = await currentDataResponse.json()
        if (currentDataResult.data) setCurrentChartData(currentDataResult.data)
      }

      // Actualizar gráfica de monitoreo en tiempo real
      let realtimeUrl = '/api/dashboard/realtime-power-data'
      const refreshDateParams = buildDateFilterParams({
        startDate: dateRangeStart,
        endDate: dateRangeEnd,
        startTimeOption: dateRangeStartTime,
        endTimeOption: dateRangeEndTime,
        includeMachineId: false,
      })

      if (refreshDateParams.queryString) {
        realtimeUrl += refreshDateParams.queryString
      }

      const realtimeResponse = await fetch(realtimeUrl)
      const realtimeResult = await realtimeResponse.json()
      if (realtimeResult.data) {
        setChartData(realtimeResult.data)
        // Resetear zoom cuando se actualizan los datos
        setTimeout(() => {
          setBrushStartIndex(undefined)
          setBrushEndIndex(undefined)
          setBrushStartIndexPower(undefined)
          setBrushEndIndexPower(undefined)
          setBrushResetKey(prev => prev + 1)
          setBrushResetKeyPower(prev => prev + 1)
        }, 100)
      }
      if (realtimeResult.date) {
        setRealtimeDate(new Date(realtimeResult.date))
      }
      if (realtimeResult.machines) {
        setRealtimeMachines(realtimeResult.machines)
      }

      // Actualizar gráfica de potencia por día si hay un rango de días
      if (dateRangeStart && dateRangeEnd && refreshDateParams.startDateTime && refreshDateParams.endDateTime) {
        const startDay = new Date(dateRangeStart)
        startDay.setUTCHours(0, 0, 0, 0)
        const endDay = new Date(dateRangeEnd)
        endDay.setUTCHours(0, 0, 0, 0)

        if (startDay.getTime() !== endDay.getTime()) {
          const params = new URLSearchParams({
            startDate: refreshDateParams.startDateTime.toISOString(),
            endDate: refreshDateParams.endDateTime.toISOString(),
          })
          if (appliedSelectedMachines.length > 0) {
            params.set('machineIds', appliedSelectedMachines.join(','))
          }
          const dailyPowerResponse = await fetch(`/api/dashboard/daily-power-totals?${params.toString()}`)
          const dailyPowerResult = await dailyPowerResponse.json()
          if (dailyPowerResult.data) {
            setDailyPowerChartData(dailyPowerResult.data)
          }

          // Obtener datos por hora para gráfica de días apilados
          const dailyPowerByHourResponse = await fetch(`/api/dashboard/daily-power-by-hour?${params.toString()}`)
          const dailyPowerByHourResult = await dailyPowerByHourResponse.json()
          if (dailyPowerByHourResult.data && dailyPowerByHourResult.days) {
            setDailyPowerByHourData({ data: dailyPowerByHourResult.data, days: dailyPowerByHourResult.days })
            // Resetear zoom cuando se actualizan los datos
            setBrushStartIndexDailyPower(undefined)
            setBrushEndIndexDailyPower(undefined)
            setBrushResetKeyDailyPower(prev => prev + 1)
          }
        } else {
          setDailyPowerChartData([])
          setDailyPowerByHourData({ data: [], days: [] })
          // Resetear zoom cuando se limpian los datos
          setBrushStartIndexDailyPower(undefined)
          setBrushEndIndexDailyPower(undefined)
          setBrushResetKeyDailyPower(prev => prev + 1)
        }
      } else {
        setDailyPowerChartData([])
        setDailyPowerByHourData({ data: [], days: [] })
        // Resetear zoom cuando se limpian los datos
        setBrushStartIndexDailyPower(undefined)
        setBrushEndIndexDailyPower(undefined)
        setBrushResetKeyDailyPower(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMachineToggle = (id: string) => {
    setSelectedMachines(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleToggleAllMachines = () => {
    if (selectedMachines.length === realtimeMachines.length && realtimeMachines.length > 0) {
      // Si todas están seleccionadas, deseleccionar todas
      setSelectedMachines([])
    } else {
      // Si no todas están seleccionadas, seleccionar todas
      const allMachineIds = realtimeMachines.map(m => m.id)
      setSelectedMachines(allMachineIds)
    }
  }

  const handleOpenReportDialog = () => {
    // Validar que haya al menos una fecha de inicio aplicada
    if (!appliedDateRangeStart) {
      toast({
        title: "Fecha requerida",
        description: "Por favor selecciona y aplica al menos una fecha antes de generar el reporte.",
        variant: "destructive"
      })
      return
    }

    // Generar nombre por defecto
    const startDateStr = appliedDateRangeStart ? format(appliedDateRangeStart, "dd-MM-yyyy") : format(new Date(), "dd-MM-yyyy")
    const endDateStr = appliedDateRangeEnd ? format(appliedDateRangeEnd, "dd-MM-yyyy") : format(new Date(), "dd-MM-yyyy")
    
    // Si es el mismo día o solo hay fecha de inicio, usar formato de un solo día
    const isSameDay = appliedDateRangeStart && appliedDateRangeEnd && 
                      appliedDateRangeStart.toDateString() === appliedDateRangeEnd.toDateString()
    const defaultName = isSameDay || !appliedDateRangeEnd
      ? `Reporte de Consumo Eléctrico - ${startDateStr}`
      : `Reporte de Consumo Eléctrico - ${startDateStr} al ${endDateStr}`
    
    setCustomReportName(defaultName)
    setUseCustomReportName(false)
    setShowReportNameDialog(true)
  }

  const handleGenerateReport = async () => {
    if (isGeneratingPDF) return
    
    // Cerrar el diálogo inmediatamente
    setShowReportNameDialog(false)
    
    // Validar que haya al menos una fecha de inicio aplicada
    if (!appliedDateRangeStart) {
      toast({
        title: "Fecha requerida",
        description: "Por favor selecciona y aplica al menos una fecha antes de generar el reporte.",
        variant: "destructive"
      })
      return
    }
    
    // Si solo hay fecha de inicio, usar la misma como fin
    const reportStartDate = appliedDateRangeStart
    const reportEndDate = appliedDateRangeEnd || appliedDateRangeStart
    const reportStartTime = appliedDateRangeStartTime
    // Usar la hora de fin personalizada si existe, de lo contrario usar la de inicio
    const reportEndTime = (appliedDateRangeEndTime && appliedDateRangeEndTime !== DEFAULT_TIME_OPTION) 
      ? appliedDateRangeEndTime 
      : (appliedDateRangeEnd ? appliedDateRangeEndTime : appliedDateRangeStartTime)
    
    console.log('🕐 Horas del reporte:')
    console.log('  appliedDateRangeStart:', appliedDateRangeStart)
    console.log('  appliedDateRangeEnd:', appliedDateRangeEnd)
    console.log('  appliedDateRangeStartTime:', appliedDateRangeStartTime)
    console.log('  appliedDateRangeEndTime:', appliedDateRangeEndTime)
    console.log('  reportStartTime:', reportStartTime)
    console.log('  reportEndTime:', reportEndTime)
    console.log('  ¿Existe appliedDateRangeEnd?:', !!appliedDateRangeEnd)
    
    setIsGeneratingPDF(true)
    try {
      toast({
        title: "Generando reporte",
        description: "Capturando gráficas y procesando datos...",
      })

      // Convertir logo a base64 para el PDF
      const logoBase64 = await fetch('/company_logo.png')
        .then(res => res.blob())
        .then(blob => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        })
        .catch(() => '')

      // 1. Capturar gráficas del dashboard existente
      const chartImages: Partial<Record<string, string>> = {}
      
      // Función auxiliar para capturar un chart de Recharts
      const captureChart = async (chartId: string): Promise<string | undefined> => {
        const chartElement = document.querySelector(`[data-chart="${chartId}"]`) as HTMLElement
        if (!chartElement) return undefined
        
        try {
          // Si es la gráfica power-chart, temporalmente agregar leyenda
          let legendElement: HTMLDivElement | null = null
          if (chartId === 'power-chart') {
            // Crear contenedor de leyenda
            legendElement = document.createElement('div')
            legendElement.style.cssText = `
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 16px;
              padding: 12px;
              background: white;
              border-radius: 8px;
              margin-bottom: 8px;
            `
            
            // Agregar cada máquina a la leyenda
            const colors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6"]
            appliedSelectedMachines.forEach((machineId, index) => {
              const machine = realtimeMachines.find(m => m.id === machineId)
              const color = colors[index % colors.length]
              
              const item = document.createElement('div')
              item.style.cssText = 'display: flex; align-items: center; gap: 6px;'
              
              const colorBox = document.createElement('div')
              colorBox.style.cssText = `width: 12px; height: 12px; background: ${color}; border-radius: 2px;`
              
              const label = document.createElement('span')
              label.style.cssText = 'font-size: 13px; color: #374151; font-weight: 500;'
              label.textContent = machine?.name || machineId
              
              item.appendChild(colorBox)
              item.appendChild(label)
              legendElement!.appendChild(item)
            })
            
            // Insertar leyenda antes de la gráfica
            chartElement.insertBefore(legendElement, chartElement.firstChild)
          }
          
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#FFFFFF",
            logging: false,
            ...(chartId === 'power-chart' && {
              height: chartElement.offsetHeight + 50,
              windowHeight: chartElement.scrollHeight + 50,
            }),
          })
          
          // Remover leyenda temporal si se agregó
          if (legendElement) {
            chartElement.removeChild(legendElement)
          }
          
          return canvas.toDataURL("image/png", 0.95)
        } catch (error) {
          console.error(`Error capturando gráfica ${chartId}:`, error)
          return undefined
        }
      }

      // Capturar las gráficas principales del dashboard
      chartImages.powerTime = await captureChart('power-chart')
      chartImages.powerTotal = await captureChart('power-total-chart')
      chartImages.dailyPowerByHour = await captureChart('daily-power-by-hour-chart')
      chartImages.voltage = await captureChart('voltage-chart')
      chartImages.current = await captureChart('current-chart')
      chartImages.dailyPower = await captureChart('daily-power-chart')

      // 2. Obtener KPIs dinámicos basados en los filtros aplicados
      let reportCycleEnergy = { imported: 0, exported: 0 }
      let reportEstimatedCost = 0
      let reportCo2Emissions = 0
      let reportPowerFactor = powerFactor
      let reportAlertsCount = alertsCount
      
      if (appliedDateRangeStart && appliedDateRangeEnd) {
        try {
          const { queryString } = buildDateFilterParams({
            startDate: appliedDateRangeStart,
            endDate: appliedDateRangeEnd,
            startTimeOption: appliedDateRangeStartTime,
            endTimeOption: appliedDateRangeEndTime,
            machineIds: appliedSelectedMachines,
            calcMode: appliedCalculationMode,
          })

          // Obtener energía del ciclo
          const energyResponse = await fetch(`/api/dashboard/cycle-energy${queryString}`)
          const energyData = await energyResponse.json()
          reportCycleEnergy = {
            imported: energyData.accumulated_kwh_imported || 0,
            exported: energyData.accumulated_kwh_exported || 0
          }

          // Obtener costo estimado
          const costResponse = await fetch(`/api/dashboard/estimated-cost${queryString}`)
          const costData = await costResponse.json()
          reportEstimatedCost = costData.estimatedCost || 0

          // Obtener CO2
          const co2Response = await fetch(`/api/dashboard/co2-emissions${queryString}`)
          const co2Data = await co2Response.json()
          reportCo2Emissions = co2Data.co2_kg || 0

          // Obtener factor de potencia
          const powerFactorResponse = await fetch(`/api/dashboard/power-factor${queryString}`)
          const powerFactorData = await powerFactorResponse.json()
          reportPowerFactor = powerFactorData.power_factor || 0

          // Obtener conteo de alertas
          const alertsResponse = await fetch(`/api/dashboard/alerts-count${queryString}`)
          const alertsData = await alertsResponse.json()
          reportAlertsCount = alertsData.count || 0

          console.log('📊 KPIs del reporte obtenidos:', { reportCycleEnergy, reportEstimatedCost, reportCo2Emissions, reportPowerFactor, reportAlertsCount })
        } catch (error) {
          console.error('Error obteniendo KPIs del reporte:', error)
          // Fallback a los valores actuales del dashboard
          reportCycleEnergy = cycleEnergy
          reportEstimatedCost = estimatedCost
          reportCo2Emissions = co2Emissions
          reportPowerFactor = powerFactor
          reportAlertsCount = alertsCount
        }
      } else {
        // Si no hay rango, usar los valores actuales del dashboard
        reportCycleEnergy = cycleEnergy
        reportEstimatedCost = estimatedCost
        reportCo2Emissions = co2Emissions
        reportPowerFactor = powerFactor
        reportAlertsCount = alertsCount
      }

      // 3. Obtener datos reales de máquinas desde la API
      let machineDetails: any[] = []
      let totalKwh = 0
      let tarifaPorKwh = 0 // Tarifa extraída de los datos
      
      console.log('📅 Fechas para el reporte:')
      console.log('  reportStartDate:', reportStartDate?.toISOString())
      console.log('  reportEndDate:', reportEndDate?.toISOString())
      
      if (reportStartDate && reportEndDate) {
        try {
          // Usar buildDateFilterParams para obtener las fechas correctamente formateadas
          const { queryString } = buildDateFilterParams({
            startDate: reportStartDate,
            endDate: reportEndDate,
            startTimeOption: reportStartTime,
            endTimeOption: reportEndTime,
            machineIds: appliedSelectedMachines,
            calcMode: appliedCalculationMode,
            includeMachineId: false
          })
          
          const apiUrl = `/api/dashboard/machine-details${queryString}`
          console.log('🔍 Llamando a machine-details API:', apiUrl)
          
          const response = await fetch(apiUrl)
          console.log('📡 Response status:', response.status, response.ok)
          
          if (response.ok) {
            const data = await response.json()
            console.log('✅ Datos recibidos de API:', data)
            console.log('   - data.machines existe?', !!data.machines)
            console.log('   - data.machines.length:', data.machines?.length)
            machineDetails = data.machines || []
            
            // Extraer tarifa de una máquina no-DMG que tenga consumo
            const nonDMGMachine = machineDetails.find(m => {
              const isDMG = m.branchId === 'LA-007' || m.name?.toLowerCase().includes('dmg')
              return !isDMG && m.totalKwh > 0 && m.cost > 0
            })
            if (nonDMGMachine) {
              tarifaPorKwh = nonDMGMachine.cost / nonDMGMachine.totalKwh
              console.log('💰 Tarifa extraída:', tarifaPorKwh, 'de máquina:', nonDMGMachine.name)
            } else {
              // Fallback: usar tarifa por defecto si no hay máquinas para extraer
              tarifaPorKwh = reportEstimatedCost / reportCycleEnergy.imported
              console.log('💰 Tarifa fallback:', tarifaPorKwh)
            }
            
            totalKwh = machineDetails.reduce((sum, m) => sum + m.totalKwh, 0)
            console.log('📊 Total kWh calculado:', totalKwh, 'Máquinas:', machineDetails.length)
            
            // Verificar que los datos tengan valores reales
            if (machineDetails.length > 0) {
              console.log('🔍 Primer máquina de ejemplo:', machineDetails[0])
            } else {
              console.warn('⚠️ API devolvió array vacío de máquinas')
            }
          } else {
            const errorData = await response.json()
            console.error('❌ API error:', response.status, errorData)
          }
        } catch (error) {
          console.error("❌ Error obteniendo detalles de máquinas:", error)
        }
      } else {
        console.log('⚠️ No hay rango de fechas aplicado')
        console.log('appliedDateRangeStart:', appliedDateRangeStart)
        console.log('appliedDateRangeEnd:', appliedDateRangeEnd)
      }

      // Si no se obtuvieron datos de la API, no generar reporte
      if (machineDetails.length === 0) {
        console.warn('⚠️ No se obtuvieron datos de máquinas')
        totalKwh = 0
      } else {
        console.log('✅ Usando datos reales de la API:', machineDetails.length, 'máquinas')
        // Recalcular totalKwh solo con las máquinas que contribuyen positivamente
        totalKwh = machineDetails.reduce((sum, m) => {
          const isDMG = m.branchId === 'LA-007' || m.name?.toLowerCase().includes('dmg')
          if (isDMG) {
            const netKwh = (m.importedKwh || 0) - (m.exportedKwh || 0)
            return sum + Math.max(0, netKwh)
          }
          return sum + (m.totalKwh || 0)
        }, 0)
        console.log('📊 Total kWh recalculado para porcentajes:', totalKwh)
      }

      // Encontrar máquina con mayor consumo
      const topMachine = machineDetails.length > 0 
        ? machineDetails.reduce((max, m) => m.totalKwh > max.totalKwh ? m : max, machineDetails[0])
        : null

      // Formatear horas basándose en los filtros seleccionados
      const getFormattedTime = (timeOption: string | undefined, mode: "start" | "end") => {
        if (!timeOption || timeOption === DEFAULT_TIME_OPTION) {
          // Si es "Por defecto", usar el horario de configuración
          if (mode === "start") {
            const hours = Math.floor(workHoursConfig.startMinutes / 60)
            const minutes = workHoursConfig.startMinutes % 60
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
          } else {
            const hours = Math.floor(workHoursConfig.endMinutes / 60)
            const minutes = workHoursConfig.endMinutes % 60
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
          }
        }
        return timeOption // Ya está en formato HH:MM
      }

      // 3. Preparar datos para el template
      const reportData = {
        startDate: reportStartDate ? format(reportStartDate, "dd/MM/yyyy", { locale: es }) : format(new Date(), "dd/MM/yyyy", { locale: es }),
        endDate: reportEndDate ? format(reportEndDate, "dd/MM/yyyy", { locale: es }) : format(new Date(), "dd/MM/yyyy", { locale: es }),
        startTime: getFormattedTime(reportStartTime, "start"),
        endTime: getFormattedTime(reportEndTime, "end"),
        generatedDate: format(new Date(), "dd/MM/yyyy", { locale: es }),
        generatedTime: format(new Date(), "HH:mm", { locale: es }),
        calculationMode: appliedCalculationMode,
        selectedMachines: appliedSelectedMachines.length > 0 
          ? realtimeMachines
              .filter(m => appliedSelectedMachines.includes(m.id))
              .map(m => m.name)
          : undefined,
        logoBase64,
        kpis: {
          totalEnergy: reportCycleEnergy.imported,
          exportedEnergy: reportCycleEnergy.exported,
          totalCost: reportEstimatedCost,
          topMachine: topMachine?.name || "N/A",
          avgPowerFactor: reportPowerFactor,
          alertsCount: reportAlertsCount
        },
        machines: machineDetails.map((machine) => {
          // Para máquina 7 (DMG), mostrar importados/exportados por separado
          const isDMG = machine.branchId === 'LA-007' || machine.name.toLowerCase().includes('dmg')
          const netKwhConsumed = (machine.importedKwh || 0) - (machine.exportedKwh || 0)
          const kwhForPercentage = isDMG ? Math.max(0, netKwhConsumed) : (machine.totalKwh || 0)
          
          // Para DMG: calcular costo basado en consumo neto usando tarifa real
          // Si exporta más de lo que importa, el costo será negativo (ahorro)
          const dmgCost = isDMG ? netKwhConsumed * tarifaPorKwh : machine.cost
          
          return {
            name: machine.name || 'N/A',
            kwh: machine.totalKwh || 0,
            importedKwh: machine.importedKwh || 0,
            exportedKwh: machine.exportedKwh || 0,
            isDMG: isDMG,
            cost: dmgCost || 0,
            percentage: totalKwh > 0 ? (kwhForPercentage / totalKwh) * 100 : 0,
            maxPower: machine.maxPower || 0
          }
        }),
        charts: chartImages,
        analysis: `Durante el periodo analizado se registró un consumo total de ${reportCycleEnergy.imported.toFixed(1)} kWh, con una exportación de ${reportCycleEnergy.exported.toFixed(1)} kWh. El costo estimado alcanzó $${reportEstimatedCost.toFixed(2)} MXN. El factor de potencia promedio se mantuvo en ${(reportPowerFactor * 100).toFixed(1)}%, indicando una operación ${reportPowerFactor >= 0.9 ? 'eficiente' : 'que requiere atención'} del sistema eléctrico. ${topMachine ? `La máquina "${topMachine.name}" presentó el mayor consumo con ${topMachine.totalKwh.toFixed(1)} kWh.` : ''} Se recomienda mantener el monitoreo continuo para optimizar el consumo energético.`
      }
      
      console.log('📄 Datos finales para el reporte:')
      console.log('  Total máquinas:', reportData.machines.length)
      console.log('  Primera máquina:', reportData.machines[0])
      console.log('  Total kWh global:', totalKwh)

      // 4. Renderizar template temporalmente en el DOM
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '0'
      document.body.appendChild(tempContainer)
      
      const { createRoot } = await import('react-dom/client')
      const root = createRoot(tempContainer)
      
      await new Promise<void>((resolve) => {
        root.render(<PDFReportTemplate data={reportData} />)
        setTimeout(resolve, 1000) // Esperar a que se renderice completamente
      })

      const captureOptions = {
        scale: 2,
        useCORS: true,
        backgroundColor: "#F9FAFB",
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
      } as const

      // 5. Capturar cada sección del template
      const sectionIds = ['pdf-cover', 'pdf-kpis', 'pdf-charts', 'pdf-charts-2', 'pdf-machine-table', 'pdf-analysis']
      const canvases: HTMLCanvasElement[] = []
      
      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId)
        if (section) {
          const canvas = await html2canvas(section, captureOptions)
          canvases.push(canvas)
        }
      }

      // 6. Crear PDF y añadir cada sección como una página
      const pdf = new jsPDF("p", "mm", "a4")
      pdf.setProperties({
        title: "Reporte de Consumo Energético - EcoMonitor IoT",
        subject: "Análisis de consumo energético industrial",
        author: "EcoMonitor IoT",
        keywords: ["ecomonitor", "energía", "industrial", "reporte", "iot"].join(", "),
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Añadir cada canvas como una página completa
      canvases.forEach((canvas, index) => {
        if (index > 0) {
          pdf.addPage()
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.9)
        const imgWidth = pageWidth
        const imgHeight = (canvas.height * pageWidth) / canvas.width

        // Si la imagen es muy alta, escalarla para que quepa
        if (imgHeight > pageHeight) {
          const scaledWidth = (canvas.width * pageHeight) / canvas.height
          pdf.addImage(imgData, "JPEG", (pageWidth - scaledWidth) / 2, 0, scaledWidth, pageHeight, undefined, 'FAST')
        } else {
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, 'FAST')
        }
      })

      // 7. Limpiar DOM temporal
      root.unmount()
      document.body.removeChild(tempContainer)

      // 8. Convertir PDF a Blob para subir a Supabase
      const pdfBlob = pdf.output('blob')
      const fileName = `reporte-ecomonitor-${format(new Date(), "yyyy-MM-dd-HHmmss")}.pdf`
      const year = format(new Date(), "yyyy")
      const month = format(new Date(), "MM")
      const storagePath = `reports/${year}/${month}/${fileName}`

      // Usar el nombre personalizado si está activado, de lo contrario usar el por defecto
      const isSameDayReport = appliedDateRangeStart && appliedDateRangeEnd && 
                              appliedDateRangeStart.toDateString() === appliedDateRangeEnd.toDateString()
      const defaultReportName = isSameDayReport || !appliedDateRangeEnd
        ? `Reporte de Consumo Eléctrico - ${appliedDateRangeStart ? format(appliedDateRangeStart, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}`
        : `Reporte de Consumo Eléctrico - ${appliedDateRangeStart ? format(appliedDateRangeStart, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")} al ${appliedDateRangeEnd ? format(appliedDateRangeEnd, "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}`
      
      const reportName = useCustomReportName && customReportName.trim() 
        ? customReportName.trim()
        : defaultReportName

      toast({
        title: "Subiendo reporte",
        description: "Guardando en el servidor...",
      })

      // 9. Subir PDF a Supabase Storage
      const formData = new FormData()
      formData.append('file', pdfBlob, fileName)
      formData.append('path', storagePath)
      formData.append('name', reportName)
      
      // Enviar fechas en formato YYYY-MM-DD (solo fecha, sin hora)
      const formatDateOnly = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      // Si no hay fecha de fin, usar la misma fecha de inicio (un solo día)
      const startDate = appliedDateRangeStart || new Date()
      const endDate = appliedDateRangeEnd || appliedDateRangeStart || new Date()
      
      formData.append('period_start', formatDateOnly(startDate))
      formData.append('period_end', formatDateOnly(endDate))
      formData.append('machines_count', machineDetails.length.toString())
      formData.append('total_energy_kwh', cycleEnergy.imported.toString())
      formData.append('total_cost', estimatedCost.toString())

      const uploadResponse = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Error al subir el reporte')
      }

      const uploadResult = await uploadResponse.json()

      // 10. También descargar localmente
      pdf.save(fileName)

      toast({
        title: "Reporte generado y guardado",
        description: "El PDF se ha descargado y guardado en el historial.",
      })
    } catch (error) {
      console.error("Error al generar el reporte:", error)
      toast({
        title: "Error al generar reporte",
        description: "Ocurrió un error al generar el PDF. Intenta nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const normalizeDateToMidnight = (date: Date) => { const d = new Date(date); d.setUTCHours(0,0,0,0); return d }
  const isDateDisabled = (date: Date) => {
    if (!dateRangeLimits.start || !dateRangeLimits.end) return true
    const nd = normalizeDateToMidnight(date)
    const ns = normalizeDateToMidnight(dateRangeLimits.start)
    const ne = normalizeDateToMidnight(dateRangeLimits.end)
    return nd < ns || nd > ne
  }
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) { setIsCalendarOpen(false); return }
    if (isDateDisabled(date)) return
    if (!dateRangeStart || (dateRangeStart && dateRangeEnd)) {
      setDateRangeStart(date)
      setDateRangeEnd(undefined)
      setDateRangeStartTime(DEFAULT_TIME_OPTION)
      setDateRangeEndTime(DEFAULT_TIME_OPTION)
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
    const startLabel = dateRangeStart ? formatDateWithOptionalTime(dateRangeStart, dateRangeStartTime) : undefined
    const endLabel = dateRangeEnd ? formatDateWithOptionalTime(dateRangeEnd, dateRangeEndTime) : undefined

    if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
    if (startLabel) {
      if (dateRangeEndTime && dateRangeEndTime !== DEFAULT_TIME_OPTION) {
        return `${startLabel} · Hasta ${dateRangeEndTime}`
      }
      return startLabel
    }
    return "Seleccionar rango de fechas"
  }
  const CustomCalendar = () => {
    const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
    const dayNames = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
    const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay()
    const normalize = (d: Date) => { const n = new Date(d); n.setUTCHours(0,0,0,0); return n }
    const isDis = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 0,0,0,0)
      if (!dateRangeLimits.start || !dateRangeLimits.end) return true
      return normalize(date) < normalize(dateRangeLimits.start) || normalize(date) > normalize(dateRangeLimits.end)
    }
    const isSel = (day: number) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 0,0,0,0)
      if (dateRangeStart && date.toDateString() === dateRangeStart.toDateString()) return true
      if (dateRangeEnd && date.toDateString() === dateRangeEnd.toDateString()) return true
      if (dateRangeStart && dateRangeEnd && date >= dateRangeStart && date <= dateRangeEnd) return true
      return false
    }
    const onClickDay = (day: number) => { const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 0,0,0,0); if (!isDis(day)) handleDateSelect(d) }
    const prev = () => { const n = new Date(currentMonth); n.setMonth(currentMonth.getMonth() - 1); setCurrentMonth(n) }
    const next = () => { const n = new Date(currentMonth); n.setMonth(currentMonth.getMonth() + 1); setCurrentMonth(n) }
    const canPrev = () => { if (!dateRangeLimits.start) return false; const nc = normalize(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1, 0,0,0,0)); const ns = normalize(dateRangeLimits.start); return nc > ns }
    const canNext = () => { if (!dateRangeLimits.end) return false; const nm = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1, 0,0,0,0); const nn = normalize(nm); const ne = normalize(dateRangeLimits.end); return nn <= ne }
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days: (number|null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return (
      <div className="w-80 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={prev} disabled={!canPrev()} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-lg font-semibold">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
          <Button variant="outline" size="sm" onClick={next} disabled={!canNext()} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">{dayNames.map(d => (<div key={d} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">{d}</div>))}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <div key={index} className="h-8 flex items-center justify-center">
              {day && (
                <button onClick={() => onClickDay(day)} disabled={isDis(day)} className={cn("w-full h-full rounded-md text-sm transition-colors", isSel(day) ? "bg-primary text-primary-foreground" : isDis(day) ? "text-muted-foreground opacity-50 cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground cursor-pointer")}>{day}</button>
              )}
            </div>
          ))}
        </div>
        {dateRangeStart && calculationMode !== "total_consumption" && (
          <div className="mt-4 space-y-3 border-t border-emerald-200 dark:border-emerald-800 pt-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora inicial</p>
              <Select value={dateRangeStartTime} onValueChange={(value) => setDateRangeStartTime(value as "default" | string)}>
                <SelectTrigger className="h-9 w-full justify-between border-emerald-200 dark:border-emerald-800">
                  <SelectValue placeholder="Selecciona una hora" />
                </SelectTrigger>
                <SelectContent className="border-emerald-200 dark:border-emerald-800">
                  <SelectItem value={DEFAULT_TIME_OPTION}>
                    Por defecto ({String(Math.floor(workHoursConfig.startMinutes / 60)).padStart(2, '0')}:{String(workHoursConfig.startMinutes % 60).padStart(2, '0')})
                  </SelectItem>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora final</p>
                {!dateRangeEnd && (
                  <span className="text-[11px] text-muted-foreground">Se aplicará al mismo día</span>
                )}
              </div>
              <Select value={dateRangeEndTime} onValueChange={(value) => setDateRangeEndTime(value as "default" | string)}>
                <SelectTrigger className="h-9 w-full justify-between border-emerald-200 dark:border-emerald-800">
                  <SelectValue placeholder="Selecciona una hora" />
                </SelectTrigger>
                <SelectContent className="border-emerald-200 dark:border-emerald-800">
                  <SelectItem value={DEFAULT_TIME_OPTION}>
                    Por defecto ({String(Math.floor(workHoursConfig.endMinutes / 60)).padStart(2, '0')}:{String(workHoursConfig.endMinutes % 60).padStart(2, '0')})
                  </SelectItem>
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    )
  }

  const appliedRangeText = composeRangeText(
    appliedDateRangeStart,
    appliedDateRangeEnd,
    appliedDateRangeStartTime,
    appliedDateRangeEndTime
  )
  const hasAppliedRangeEnd = Boolean(appliedDateRangeStart && appliedDateRangeEnd)

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <button className={"border-emerald-200 dark:border-emerald-800 data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-emerald-950/20 relative flex min-w-[320px] max-w-[420px] items-center justify-center gap-3 rounded-md border bg-transparent px-4 py-2 text-sm shadow-xs transition-[color,box-shadow,background-color] hover:bg-emerald-50 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"} type="button">
                <CalendarIcon className="h-4 w-4 shrink-0 absolute left-3" />
                <span className="truncate text-center flex-1 min-w-0">{getDateDisplayText()}</span>
                <ChevronDown className="size-4 opacity-50 shrink-0 absolute right-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-emerald-200 dark:border-emerald-800">
              <CustomCalendar />
            </PopoverContent>
          </Popover>
          <Select value={calculationMode} onValueChange={(value) => setCalculationMode(value as "full_day" | "custom_time" | "total_consumption")}>
            <SelectTrigger className="w-48 h-9 border-emerald-200 dark:border-emerald-800 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
              <SelectValue placeholder="Modo de cálculo" />
            </SelectTrigger>
            <SelectContent className="border-emerald-200 dark:border-emerald-800">
              <SelectItem
                value="custom_time"
                className="data-[state=checked]:bg-emerald-100 data-[state=checked]:text-emerald-800 dark:data-[state=checked]:bg-emerald-900/60 dark:data-[state=checked]:text-emerald-100"
              >
                Horario personalizado
              </SelectItem>
              <SelectItem
                value="full_day"
                className="data-[state=checked]:bg-emerald-100 data-[state=checked]:text-emerald-800 dark:data-[state=checked]:bg-emerald-900/60 dark:data-[state=checked]:text-emerald-100"
              >
                Día completo (24h)
              </SelectItem>
              <SelectItem
                value="total_consumption"
                className="data-[state=checked]:bg-emerald-100 data-[state=checked]:text-emerald-800 dark:data-[state=checked]:bg-emerald-900/60 dark:data-[state=checked]:text-emerald-100"
              >
                Consumo Total
              </SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <button disabled={calculationMode === "total_consumption"} className={"border-emerald-200 dark:border-emerald-800 data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-emerald-500 focus-visible:ring-emerald-500/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-emerald-950/20 flex w-32 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,background-color] hover:bg-emerald-50 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"} type="button">
                <span>Máquinas ({selectedMachines.length})</span>
                <ChevronDown className="size-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 border-emerald-200 dark:border-emerald-800">
              <div className="space-y-2">
                {realtimeMachines.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Cargando máquinas...</div>
                ) : (
                  <>
                    {/* Opción para seleccionar/deseleccionar todas */}
                    <div className="border-b border-emerald-200 dark:border-emerald-800 pb-2 mb-2">
                      <div 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleAllMachines()
                        }}
                        className="flex items-center space-x-2 p-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer"
                      >
                        <Checkbox 
                          id="select-all-machines" 
                          checked={selectedMachines.length === realtimeMachines.length && realtimeMachines.length > 0}
                          onCheckedChange={(checked) => {
                            // Evitar que el checkbox maneje el cambio automáticamente
                            // La lógica se maneja desde el onClick del contenedor
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleAllMachines()
                          }}
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 focus:ring-emerald-500 pointer-events-auto" 
                        />
                        <span 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleAllMachines()
                          }}
                          className="text-sm font-medium hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer flex-1"
                        >
                          {selectedMachines.length === realtimeMachines.length && realtimeMachines.length > 0
                            ? "Deseleccionar todas"
                            : "Seleccionar todas"}
                        </span>
                      </div>
                    </div>
                    {/* Lista de máquinas */}
                    {realtimeMachines.map((machine) => (
                      <div key={machine.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
                        <Checkbox id={machine.id} checked={selectedMachines.includes(machine.id)} onCheckedChange={() => handleMachineToggle(machine.id)} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 focus:ring-emerald-500" />
                        <label htmlFor={machine.id} className="text-sm hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer">{machine.name}</label>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={() => {
            // Guardar las fechas aplicadas antes de hacer el fetch
            setAppliedDateRangeStart(dateRangeStart)
            setAppliedDateRangeEnd(dateRangeEnd)
            setAppliedDateRangeStartTime(dateRangeStartTime)
            setAppliedDateRangeEndTime(dateRangeEndTime)
            setAppliedSelectedMachines(selectedMachines)
            setAppliedCalculationMode(calculationMode)
            // Luego hacer el fetch con las fechas - PASAR calculationMode directamente
            if (dateRangeStart && dateRangeEnd) fetchKPIsWithDateRange(dateRangeStart, dateRangeEnd, dateRangeStartTime, dateRangeEndTime, selectedMachines, calculationMode)
            else if (dateRangeStart) fetchKPIsWithDateRange(dateRangeStart, undefined, dateRangeStartTime, dateRangeEndTime, selectedMachines, calculationMode)
            else fetchKPIsWithDateRange(undefined, undefined, undefined, undefined, selectedMachines, calculationMode)
          }} disabled={!dateRangeStart} className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">Aplicar</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenReportDialog}
            disabled={isGeneratingPDF}
            className="gap-2"
          >
            <FileDown className={cn("h-4 w-4", isGeneratingPDF && "animate-pulse")} />
            {isGeneratingPDF ? "Generando..." : "Generar reporte"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400"
            aria-label="Refrescar datos"
            title="Refrescar"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div id="report-section" className="space-y-6">
        <div data-report-group="page-1" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard title={
          appliedDateRangeStart && appliedDateRangeEnd 
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
            : "Potencia Actual"
        } value={currentPower} unit="kW" change={0} trend="up" icon={Zap} accent="emerald" isLoading={isLoading} />
        <KPICard title="kWh del Ciclo" value={{ imported: cycleEnergy.imported, exported: cycleEnergy.exported }} unit="kWh" change={0} trend="up" icon={Battery} accent="sky" isLoading={isLoading} />
        <KPICard title="Costo Estimado" value={estimatedCost} unit="$" change={0} trend="up" icon={DollarSign} accent="amber" isLoading={isLoading} />
        <KPICard title="Factor de Potencia" value={powerFactor * 100} unit="%" change={0} trend="up" icon={Activity} accent="indigo" isLoading={isLoading} />
        <KPICard title="kg de CO2e" value={co2Emissions} unit="kg" change={0} trend="up" icon={Leaf} accent="violet" isLoading={isLoading} />
      </div>

      {/* Real-time Chart */}
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-work-sans">Monitoreo General</CardTitle>
              <CardDescription>
                {appliedDateRangeStart
                  ? hasAppliedRangeEnd
                    ? `Rango: ${appliedRangeText}`
                    : `Día: ${appliedRangeText}`
                  : realtimeDate
                  ? `Día: ${format(realtimeDate, "dd/MM/yyyy", { locale: es })}`
                  : "Último día disponible"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              {/* Legend */}
              <div className="flex items-center gap-x-3 gap-y-4 flex-wrap">
                {appliedSelectedMachines.map((machineId, index) => {
                  const colors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6"]
                  const color = colors[index % colors.length]
                  const machine = realtimeMachines.find(m => m.id === machineId)
                  const machineName = machine?.name || machineId
                  return (
                    <div key={machineId} className="flex items-center space-x-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground">{machineName}</span>
                    </div>
                  )
                })}
              </div>
              {/* Botón para resetear zoom */}
              {((brushStartIndex !== undefined && brushStartIndex !== 0) || (brushEndIndex !== undefined && brushEndIndex !== chartData.length - 1)) && chartData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBrushStartIndex(0)
                    setBrushEndIndex(chartData.length - 1)
                    setBrushResetKey(prev => prev + 1)
                  }}
                  className="h-8 text-xs"
                >
                  Resetear Zoom
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="h-80" data-chart="power-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {appliedSelectedMachines.map((machineId, index) => {
                      const colors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6"]
                      const color = colors[index % colors.length]
                      return (
                        <linearGradient key={machineId} id={`powerGradient_${machineId}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      )
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(value: string) => {
                      if (typeof value !== 'string' || value.length < 16) return value
                      return value.substring(11, 16)
                    }}
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
                    formatter={(value: number, name: string) => {
                      const machineId = name.replace('power_', '')
                      const machine = realtimeMachines.find(m => m.id === machineId)
                      const machineName = machine?.name || machineId
                      return [`${value.toFixed(1)} kW`, machineName]
                    }}
                    labelFormatter={(value: string) => {
                      // value es un ISO string (ej: 2025-10-24T13:45:00.000Z)
                      // Extraer fecha y hora del ISO string como las otras gráficas
                      if (typeof value !== 'string' || value.length < 16) return value
                      const yyyy = value.substring(0, 4)
                      const mm = value.substring(5, 7)
                      const dd = value.substring(8, 10)
                      const hhmm = value.substring(11, 16)
                      return `${dd}/${mm}/${yyyy} ${hhmm}`
                    }}
                  />
                  {appliedSelectedMachines.map((machineId, index) => {
                    const colors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6"]
                    const color = colors[index % colors.length]
                    return (
                      <Area
                        key={machineId}
                        type="monotone"
                        dataKey={`power_${machineId}`}
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#powerGradient_${machineId})`}
                        name={`power_${machineId}`}
                      />
                    )
                  })}
                  {/* Líneas verticales para separar días */}
                  {(() => {
                    if (!appliedDateRangeStart || !appliedDateRangeEnd) return null
                    const startDay = new Date(appliedDateRangeStart)
                    startDay.setUTCHours(0, 0, 0, 0)
                    const endDay = new Date(appliedDateRangeEnd)
                    endDay.setUTCHours(0, 0, 0, 0)
                    if (startDay.getTime() === endDay.getTime()) return null
                    
                    // Agrupar datos por día y encontrar rangos
                    const dayRanges: Array<{startIdx: number, endIdx: number, date: string}> = []
                    let currentDayStart = 0
                    let lastDay = chartData[0]?.timestamp?.substring(0, 10) || ''
                    
                    chartData.forEach((item, idx) => {
                      if (!item.timestamp) return
                      const currentDay = item.timestamp.substring(0, 10)
                      if (currentDay !== lastDay) {
                        // Terminar el día anterior
                        const dd = lastDay.substring(8, 10)
                        const mm = lastDay.substring(5, 7)
                        dayRanges.push({ 
                          startIdx: currentDayStart, 
                          endIdx: idx - 1, 
                          date: `${dd}/${mm}` 
                        })
                        currentDayStart = idx
                        lastDay = currentDay
                      }
                    })
                    
                    // Agregar el último día
                    if (lastDay) {
                      const dd = lastDay.substring(8, 10)
                      const mm = lastDay.substring(5, 7)
                      dayRanges.push({ 
                        startIdx: currentDayStart, 
                        endIdx: chartData.length - 1, 
                        date: `${dd}/${mm}` 
                      })
                    }
                    
                    return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                      // Calcular punto medio del rango de datos para este día
                      const midIdx = Math.floor((startIdx + endIdx) / 2)
                      const timestamp = chartData[midIdx]?.timestamp
                      const endTimestamp = chartData[endIdx]?.timestamp
                      
                      return (
                        <React.Fragment key={`day-${startIdx}`}>
                          {/* Etiqueta del día */}
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
                              style: {
                                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                              }
                            }}
                          />
                          {/* Línea divisoria al final del día (excepto el último) */}
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
                  {chartData.length > 0 && (
                    <Brush
                      key={`brush-${brushResetKey}`}
                      dataKey="timestamp"
                      height={30}
                      stroke="#10b981"
                      fill="rgba(16, 185, 129, 0.1)"
                      startIndex={brushStartIndex ?? 0}
                      endIndex={brushEndIndex ?? chartData.length - 1}
                      onChange={(props) => {
                        if (props.startIndex !== undefined && props.endIndex !== undefined) {
                          setBrushStartIndex(props.startIndex)
                          setBrushEndIndex(props.endIndex)
                        }
                      }}
                      tickFormatter={(value: string) => {
                        if (typeof value !== 'string' || value.length < 16) return value
                        return value.substring(11, 16)
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Power Total Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-work-sans">
                {appliedSelectedMachines.length > 0 
                  ? `Potencia de Máquinas Seleccionadas (${appliedSelectedMachines.length})`
                  : "Potencia Total"}
              </CardTitle>
              <CardDescription>
                {appliedDateRangeStart
                  ? hasAppliedRangeEnd
                    ? `Rango: ${appliedRangeText}`
                    : `Día: ${appliedRangeText}`
                  : "Últimas mediciones disponibles"}
              </CardDescription>
            </div>
            {/* Botón para resetear zoom */}
            {((brushStartIndexPower !== undefined && brushStartIndexPower !== 0) || (brushEndIndexPower !== undefined && brushEndIndexPower !== powerChartData.length - 1)) && powerChartData.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBrushStartIndexPower(0)
                  setBrushEndIndexPower(powerChartData.length - 1)
                  setBrushResetKeyPower(prev => prev + 1)
                }}
                className="h-8 text-xs"
              >
                Resetear Zoom
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : powerChartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Selecciona máquinas y aplica los filtros para ver la gráfica</p>
              </div>
            </div>
          ) : (
            <div className="h-80" data-chart="power-total-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerChartData}>
                  <defs>
                    <linearGradient id="powerTotalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(value: string) => {
                      // value es un ISO string (ej: 2025-10-24T13:45:00.000Z)
                      // Mostrar solo HH:mm exactamente como viene en el ISO (sin convertir zona horaria)
                      if (typeof value !== 'string' || value.length < 16) return value
                      return value.substring(11, 16)
                    }}
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
                    formatter={(value: number) => [`${value.toFixed(2)} kW`, "Potencia Total"]}
                    labelFormatter={(value: string) => {
                      // value es ISO. Queremos dd/MM/yyyy HH:mm sin cambiar la hora original del ISO
                      if (typeof value !== 'string') return value as unknown as string
                      // Extraer fecha y hora del ISO
                      // ISO esperado: YYYY-MM-DDTHH:mm:ss.sssZ
                      const yyyy = value.substring(0, 4)
                      const mm = value.substring(5, 7)
                      const dd = value.substring(8, 10)
                      const hhmm = value.substring(11, 16)
                      return `${dd}/${mm}/${yyyy} ${hhmm}`
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#powerTotalGradient)"
                    name="Potencia Total"
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
                    const firstTimestamp = powerChartData[0]?.timestamp
                    let lastDay = (typeof firstTimestamp === 'string' && firstTimestamp.length >= 10) ? firstTimestamp.substring(0, 10) : ''
                    
                    powerChartData.forEach((item, idx) => {
                      if (!item.timestamp || typeof item.timestamp !== 'string') return
                      const currentDay = item.timestamp.substring(0, 10)
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
                      dayRanges.push({ startIdx: currentDayStart, endIdx: powerChartData.length - 1, date: `${dd}/${mm}` })
                    }
                    
                    return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                      const midIdx = Math.floor((startIdx + endIdx) / 2)
                      const timestamp = powerChartData[midIdx]?.timestamp
                      const endTimestamp = powerChartData[endIdx]?.timestamp
                      
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
                  {powerChartData.length > 0 && (
                    <Brush
                      key={`brush-power-${brushResetKeyPower}`}
                      dataKey="timestamp"
                      height={30}
                      stroke="#10b981"
                      fill="rgba(16, 185, 129, 0.1)"
                      startIndex={brushStartIndexPower ?? 0}
                      endIndex={brushEndIndexPower ?? powerChartData.length - 1}
                      onChange={(props) => {
                        if (props.startIndex !== undefined && props.endIndex !== undefined) {
                          setBrushStartIndexPower(props.startIndex)
                          setBrushEndIndexPower(props.endIndex)
                        }
                      }}
                      tickFormatter={(value: string) => {
                        if (typeof value !== 'string' || value.length < 16) return value
                        return value.substring(11, 16)
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

        </div>

        <div data-report-group="page-2" className="space-y-6">

      {/* Potencia por Día - Múltiples Días Apilados */}
      {appliedDateRangeStart && appliedDateRangeEnd && 
       appliedDateRangeStart.getTime() !== appliedDateRangeEnd.getTime() && 
       (() => {
         // Calcular días entre fechas
         const diffTime = Math.abs(appliedDateRangeEnd.getTime() - appliedDateRangeStart.getTime())
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
         return diffDays <= 5
       })() &&
       dailyPowerByHourData.data.length > 0 && dailyPowerByHourData.days.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-work-sans">Potencia Total por Día</CardTitle>
                <CardDescription>
                  {`Comparación de potencia por hora entre días (${appliedRangeText ?? '---'})`}
                </CardDescription>
              </div>
              {/* Botón para resetear zoom */}
              {((brushStartIndexDailyPower !== undefined && brushStartIndexDailyPower !== 0) || (brushEndIndexDailyPower !== undefined && brushEndIndexDailyPower !== dailyPowerByHourData.data.length - 1)) && dailyPowerByHourData.data.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBrushStartIndexDailyPower(0)
                    setBrushEndIndexDailyPower(dailyPowerByHourData.data.length - 1)
                    setBrushResetKeyDailyPower(prev => prev + 1)
                  }}
                  className="h-8 text-xs"
                >
                  Resetear Zoom
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80" data-chart="daily-power-by-hour-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyPowerByHourData.data}>
                    <defs>
                      {dailyPowerByHourData.days.map((day, index) => {
                        const colors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"]
                        const color = colors[index % colors.length]
                        return (
                          <linearGradient key={day} id={`dayGradient_${day}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        )
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="time"
                      tick={{ fontSize: 12 }} 
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
                    <Legend 
                      wrapperStyle={{ paddingTop: "20px" }}
                      iconType="rect"
                      formatter={(value) => {
                        if (!value || typeof value !== 'string') return value
                        try {
                          // Validar que el valor tenga el formato YYYY-MM-DD
                          if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            const date = new Date(value + 'T00:00:00')
                            if (!isNaN(date.getTime())) {
                              return format(date, "dd/MM/yyyy", { locale: es })
                            }
                          }
                          return value
                        } catch (error) {
                          return value
                        }
                      }}
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
                      formatter={(value: any, name: string) => {
                        if (value === null || value === undefined) return ['-', '']
                        const numValue = typeof value === 'number' ? value : parseFloat(value)
                        if (isNaN(numValue)) return ['-', '']
                        
                        // Formatear el nombre (que es el día en formato YYYY-MM-DD) a dd/MM/yyyy
                        let formattedName = ''
                        if (name && typeof name === 'string' && name.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          try {
                            const date = new Date(name + 'T00:00:00')
                            if (!isNaN(date.getTime())) {
                              formattedName = format(date, "dd/MM/yyyy", { locale: es })
                            } else {
                              formattedName = name
                            }
                          } catch (e) {
                            formattedName = name
                          }
                        } else {
                          formattedName = name || ''
                        }
                        
                        return [`${numValue.toFixed(2)} kW`, formattedName]
                      }}
                      labelFormatter={(value: string) => `Hora: ${value}`}
                    />
                    {dailyPowerByHourData.days.map((day, index) => {
                      const colors = ["#10b981", "#3b82f6", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"]
                      const color = colors[index % colors.length]
                      let dayFormatted = day
                      try {
                        if (day && typeof day === 'string' && day.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          const date = new Date(day + 'T00:00:00')
                          if (!isNaN(date.getTime())) {
                            dayFormatted = format(date, "dd/MM/yyyy", { locale: es })
                          }
                        }
                      } catch (error) {
                        // Si hay error, usar el valor original
                      }
                      return (
                        <Area
                          key={day}
                          type="monotone"
                          dataKey={day}
                          stroke={color}
                          strokeWidth={2}
                          fill={`url(#dayGradient_${day})`}
                          name={dayFormatted}
                          connectNulls={true}
                        />
                      )
                    })}
                    {dailyPowerByHourData.data.length > 0 && (
                      <Brush
                        key={`brush-daily-power-${brushResetKeyDailyPower}`}
                        dataKey="time"
                        height={30}
                        stroke="#10b981"
                        fill="rgba(16, 185, 129, 0.1)"
                        startIndex={brushStartIndexDailyPower ?? 0}
                        endIndex={brushEndIndexDailyPower ?? dailyPowerByHourData.data.length - 1}
                        onChange={(props) => {
                          if (props.startIndex !== undefined && props.endIndex !== undefined) {
                            setBrushStartIndexDailyPower(props.startIndex)
                            setBrushEndIndexDailyPower(props.endIndex)
                          }
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voltage Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-work-sans">Voltaje</CardTitle>
                <CardDescription>
                {appliedDateRangeStart
                  ? hasAppliedRangeEnd
                    ? `Rango: ${appliedRangeText}`
                    : `Día: ${appliedRangeText}`
                  : "Últimas mediciones disponibles"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                Estable
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80" data-chart="voltage-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={voltageChartData}>
                    <defs>
                      <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false} 
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => {
                        if (typeof value !== 'string' || value.length < 16) return value
                        return value.substring(11, 16)
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Voltaje (V)", angle: -90, position: "insideLeft" }}
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
                      formatter={(value: number) => [`${value.toFixed(1)} V`, "Voltaje"]}
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
                      dataKey="voltage"
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
                      let lastDay = voltageChartData[0]?.timestamp?.substring(0, 10) || ''
                      
                      voltageChartData.forEach((item, idx) => {
                        if (!item.timestamp) return
                        const currentDay = item.timestamp.substring(0, 10)
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
                        dayRanges.push({ startIdx: currentDayStart, endIdx: voltageChartData.length - 1, date: `${dd}/${mm}` })
                      }
                      
                      return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                        const midIdx = Math.floor((startIdx + endIdx) / 2)
                        const timestamp = voltageChartData[midIdx]?.timestamp
                        const endTimestamp = voltageChartData[endIdx]?.timestamp
                        
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-work-sans">Monitoreo de Corriente</CardTitle>
                <CardDescription>
                {appliedDateRangeStart
                  ? hasAppliedRangeEnd
                    ? `Rango: ${appliedRangeText}`
                    : `Día: ${appliedRangeText}`
                  : "Últimas mediciones disponibles"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1" />
                Variable
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80" data-chart="current-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentChartData}>
                    <defs>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="line1Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="line2Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="line3Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => {
                        if (typeof value !== 'string' || value.length < 16) return value
                        return value.substring(11, 16)
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Corriente (A)", angle: -90, position: "insideLeft" }}
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
                        const hasLineData = currentChartData.length > 0 && currentChartData[0]?.line1 !== undefined
                        const labels: Record<string, string> = {
                          'line1': 'Línea 1',
                          'line2': 'Línea 2',
                          'line3': 'Línea 3',
                          'current': hasLineData ? 'Equivalente' : 'Corriente'
                        }
                        return [`${value.toFixed(1)} A`, labels[name] || name]
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
                    <Legend 
                      wrapperStyle={{ paddingTop: "10px" }}
                      iconType="line"
                      formatter={(value) => {
                        const hasLineData = currentChartData.length > 0 && currentChartData[0]?.line1 !== undefined
                        const labels: Record<string, string> = {
                          'line1': 'Línea 1',
                          'line2': 'Línea 2',
                          'line3': 'Línea 3',
                          'current': hasLineData ? 'Equivalente' : 'Corriente Total'
                        }
                        return labels[value] || value
                      }}
                    />
                    {/* Mostrar 4 líneas si hay datos de líneas (L1, L2, L3 + Promedio), sino mostrar corriente total */}
                    {currentChartData.length > 0 && currentChartData[0]?.line1 !== undefined ? (
                      <>
                        <Area
                          type="monotone"
                          dataKey="line1"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#line1Gradient)"
                          name="line1"
                        />
                        <Area
                          type="monotone"
                          dataKey="line2"
                          stroke="#eab308"
                          strokeWidth={2}
                          fill="url(#line2Gradient)"
                          name="line2"
                        />
                        <Area
                          type="monotone"
                          dataKey="line3"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#line3Gradient)"
                          name="line3"
                        />
                        <Area
                          type="monotone"
                          dataKey="current"
                          stroke="#f97316"
                          strokeWidth={2.5}
                          fill="url(#currentGradient)"
                          name="current"
                        />
                      </>
                    ) : (
                      <Area
                        type="monotone"
                        dataKey="current"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#currentGradient)"
                        name="current"
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
                      let lastDay = currentChartData[0]?.timestamp?.substring(0, 10) || ''
                      
                      currentChartData.forEach((item, idx) => {
                        if (!item.timestamp) return
                        const currentDay = item.timestamp.substring(0, 10)
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
                        dayRanges.push({ startIdx: currentDayStart, endIdx: currentChartData.length - 1, date: `${dd}/${mm}` })
                      }
                      
                      return dayRanges.map(({ startIdx, endIdx, date }, idx) => {
                        const midIdx = Math.floor((startIdx + endIdx) / 2)
                        const timestamp = currentChartData[midIdx]?.timestamp
                        const endTimestamp = currentChartData[endIdx]?.timestamp
                        
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Power Chart - Solo se muestra cuando hay un rango de días */}
      {appliedDateRangeStart && appliedDateRangeEnd && 
       appliedDateRangeStart.getTime() !== appliedDateRangeEnd.getTime() && 
       dailyPowerChartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-work-sans">Potencia Total por Día</CardTitle>
                <CardDescription>
                  {appliedDateRangeStart
                    ? hasAppliedRangeEnd
                      ? `Rango: ${appliedRangeText}`
                      : `Día: ${appliedRangeText}`
                    : "Últimas mediciones disponibles"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1" />
                  kWh Importados
                </Badge>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mr-1" />
                  kWh Exportados
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-80 w-full" />
            ) : (
              <div className="h-80" data-chart="daily-power-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPowerChartData}>
                    <defs>
                      <linearGradient id="importedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="exportedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false} 
                      axisLine={false}
                      interval="preserveStartEnd"
                      tickFormatter={(value: string) => {
                        if (typeof value !== 'string' || value.length < 10) return value
                        // Formatear YYYY-MM-DD a DD/MM
                        const parts = value.split('-')
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}`
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
                        return [`${value.toFixed(2)} kWh`, labels[name] || name]
                      }}
                      labelFormatter={(value: string) => {
                        if (typeof value !== 'string' || value.length < 10) return value
                        // Formatear YYYY-MM-DD a DD/MM/YYYY
                        const parts = value.split('-')
                        if (parts.length === 3) {
                          return `${parts[2]}/${parts[1]}/${parts[0]}`
                        }
                        return value
                      }}
                    />
                    <Bar
                      dataKey="imported"
                      fill="url(#importedGradient)"
                      radius={[8, 8, 0, 0]}
                      name="imported"
                    />
                    <Bar
                      dataKey="exported"
                      fill="url(#exportedGradient)"
                      radius={[8, 8, 0, 0]}
                      name="exported"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

        </div>

      </div>

      {/* Diálogo para nombre del reporte */}
      <Dialog open={showReportNameDialog} onOpenChange={setShowReportNameDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Reporte PDF</DialogTitle>
            <DialogDescription>
              Personaliza el nombre del reporte o usa el nombre por defecto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="custom-name"
                checked={useCustomReportName}
                onCheckedChange={(checked) => setUseCustomReportName(checked as boolean)}
              />
              <Label htmlFor="custom-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Usar nombre personalizado
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-name">Nombre del reporte</Label>
              <Input
                id="report-name"
                value={customReportName}
                onChange={(e) => setCustomReportName(e.target.value)}
                disabled={!useCustomReportName}
                placeholder="Escribe el nombre del reporte..."
                className="w-full"
              />
              {!useCustomReportName && (
                <p className="text-xs text-muted-foreground">
                  Se usará el nombre por defecto
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportNameDialog(false)}
              disabled={isGeneratingPDF}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingPDF || (useCustomReportName && !customReportName.trim())}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isGeneratingPDF ? "Generando..." : "Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
