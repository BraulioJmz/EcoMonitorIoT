"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3,
  Clock,
  FileBarChart,
  Zap,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Report {
  id: number
  report_name: string
  start_date: string | null
  end_date: string | null
  size_mb: number | null
  file_url: string
  created_at: string
}

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const { toast } = useToast()

  // Cargar reportes desde la API
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports/list')
        const data = await response.json()
        
        if (data.success) {
          setReports(data.reports || [])
        } else {
          toast({
            title: "Error",
            description: "No se pudieron cargar los reportes",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Error cargando reportes:', error)
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con el servidor",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchReports()
  }, [])

  const handleDownload = (fileUrl: string, reportName: string) => {
    window.open(fileUrl, '_blank')
    toast({
      title: "Abriendo reporte PDF",
      description: `Visualizando ${reportName}`,
    })
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.report_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const reportsThisMonth = reports.filter(r => {
    const createdDate = new Date(r.created_at)
    return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
  }).length

  const totalSize = reports.reduce((acc, r) => acc + (r.size_mb || 0), 0).toFixed(2)

  const getReportAge = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-work-sans text-foreground flex items-center gap-3">
              <FileBarChart className="h-8 w-8 text-emerald-500" />
              Historial de Reportes
            </h1>
            <p className="text-muted-foreground mt-2">
              Visualiza y descarga reportes de consumo energético generados
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                    Total de Reportes
                  </p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {reports.length}
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                    Documentos generados
                  </p>
                </div>
                <div className="h-14 w-14 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Generados este Mes
                  </p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {reportsThisMonth}
                  </p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                    {format(new Date(), "MMMM yyyy", { locale: es })}
                  </p>
                </div>
                <div className="h-14 w-14 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar reportes por nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="font-medium">{filteredReports.length} encontrados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-work-sans text-xl flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-500" />
                Reportes Generados
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                Historial completo de análisis de consumo eléctrico
              </CardDescription>
            </div>
            {!isLoading && filteredReports.length > 0 && (
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700">
                {filteredReports.length} {filteredReports.length === 1 ? 'reporte' : 'reportes'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border-b border-slate-100 dark:border-slate-800">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-9 w-28" />
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No hay reportes disponibles
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchQuery 
                  ? "No se encontraron reportes con ese criterio de búsqueda."
                  : "Aún no se han generado reportes. Genera uno desde el Dashboard principal."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow className="border-slate-200 dark:border-slate-700">
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 w-[40%]">Nombre del Reporte</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Periodo Analizado</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Generado</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Tamaño</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300 text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report, index) => {
                    // Parsear fechas sin conversión de zona horaria
                    // Las fechas vienen como "2025-11-19" (YYYY-MM-DD)
                    const parseLocalDate = (dateString: string) => {
                      const [year, month, day] = dateString.split('-').map(Number)
                      return new Date(year, month - 1, day)
                    }
                    
                    const startDate = report.start_date ? parseLocalDate(report.start_date) : null
                    const endDate = report.end_date ? parseLocalDate(report.end_date) : null
                    const createdAt = new Date(report.created_at)
                    
                    return (
                      <TableRow 
                        key={report.id} 
                        className="border-slate-200 dark:border-slate-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-11 w-11 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileBarChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {report.report_name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {getReportAge(report.created_at)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {startDate && endDate ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                  {startDate.getTime() === endDate.getTime() 
                                    ? format(startDate, "dd MMM yy", { locale: es })
                                    : `${format(startDate, "dd MMM", { locale: es })} - ${format(endDate, "dd MMM yy", { locale: es })}`
                                  }
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Sin periodo definido</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm">
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {format(createdAt, "dd/MM/yyyy", { locale: es })}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {format(createdAt, "HH:mm", { locale: es })} hrs
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {report.size_mb ? `${report.size_mb.toFixed(2)} MB` : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(report.file_url, report.report_name)}
                            className="gap-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 transition-all duration-200"
                          >
                            <Download className="h-4 w-4" />
                            Ver PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
