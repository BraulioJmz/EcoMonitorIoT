"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import ReportEmailsSettings from "./report-emails"
import {
  Settings,
  DollarSign,
  Clock,
  AlertTriangle,
  Cpu,
  Plus,
  Edit,
  Save,
  RotateCcw,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"




interface Machine {
  id: number
  nombre: string
  codigo_branch: string
  ct_ratio: string
  potencia_maxima: number
  estado: boolean
  created_at: string
  updated_at: string
}

export default function SettingsPage() {
  const [config, setConfig] = useState({
    tariff: {
      baseRate: 0,
      valleyRate: 0,
      co2Factor: 0.444,
    },
    alerts: {
      powerThreshold: 0,
      powerFactorThreshold: 0,
      energyThreshold: 0,
      emailNotifications: false,
    },
    chartTimeRange: {
      startHour: 0,
      startMinute: 0,
      endHour: 0,
      endMinute: 0,
    },
  })
  const [machines, setMachines] = useState<Machine[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [isEditMachineOpen, setIsEditMachineOpen] = useState(false)

  // New/Edit machine form state
  const [machineForm, setMachineForm] = useState({
    name: "",
    branchCode: "",
    location: "",
    ctRatio: "",
    maxPower: 0,
    status: "active" as "active" | "inactive",
  })

  const { toast } = useToast()

  // Cargar datos desde la API
  useEffect(() => {
    const loadConfigData = async () => {
      try {
        setIsLoading(true)
        
        // Cargar tarifas
        const tariffsResponse = await fetch('/api/settings/tariffs')
        const tariffsData = await tariffsResponse.json()
        
        // Cargar configuración de alertas
        const alertsResponse = await fetch('/api/settings/alerts')
        const alertsData = await alertsResponse.json()
        
        // Cargar máquinas
        const machinesResponse = await fetch('/api/machines')
        const machinesData = await machinesResponse.json()
        
        // Convertir minutos desde medianoche a horas y minutos
        const startMinutes = Number(alertsData.hora_inicio_minutos) || 0
        const endMinutes = Number(alertsData.hora_fin_minutos) || 0
        
        const startHour = Math.floor(startMinutes / 60)
        const startMinute = startMinutes % 60
        const endHour = Math.floor(endMinutes / 60)
        const endMinute = endMinutes % 60

        const parsedCo2Factor =
          tariffsData && tariffsData.factor_co2 !== undefined && tariffsData.factor_co2 !== null
            ? Number(tariffsData.factor_co2)
            : 0.444

        // Actualizar el estado con los datos de la BD
        setConfig({
          tariff: {
            baseRate: Number(tariffsData.tarifa_pico) || 0,
            valleyRate: Number(tariffsData.tarifa_valle) || 0,
            co2Factor: Number.isFinite(parsedCo2Factor) ? parsedCo2Factor : 0.444,
          },
          alerts: {
            powerThreshold: Number(alertsData.umbral_potencia) || 0,
            powerFactorThreshold: Number(alertsData.umbral_factor_potencia) || 0,
            energyThreshold: Number(alertsData.umbral_energia) || 0,
            emailNotifications: Boolean(alertsData.email_notificaciones),
          },
          chartTimeRange: {
            startHour: startHour,
            startMinute: startMinute,
            endHour: endHour,
            endMinute: endMinute,
          },
        })
        
        // Actualizar máquinas ordenadas alfabéticamente
        const sortedMachines = machinesData.sort((a: Machine, b: Machine) => a.nombre.localeCompare(b.nombre))
        setMachines(sortedMachines)
        
      } catch (error) {
        console.error('Error loading config:', error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las configuraciones.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadConfigData()
  }, [toast])

  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as Record<string, any>),
        [field]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      // Actualizar tarifas
      const tariffsResponse = await fetch('/api/settings/tariffs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tarifa_pico: config.tariff.baseRate,
          tarifa_valle: config.tariff.valleyRate,
          factor_co2: config.tariff.co2Factor,
        }),
      })

      if (!tariffsResponse.ok) {
        throw new Error('Error updating tariffs')
      }

      // Convertir horas y minutos a minutos desde medianoche
      const startMinutes = (config.chartTimeRange.startHour * 60) + config.chartTimeRange.startMinute
      const endMinutes = (config.chartTimeRange.endHour * 60) + config.chartTimeRange.endMinute

      // Actualizar configuración de alertas
      const alertsResponse = await fetch('/api/settings/alerts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          umbral_potencia: config.alerts.powerThreshold,
          umbral_factor_potencia: config.alerts.powerFactorThreshold,
          umbral_energia: config.alerts.energyThreshold,
          email_notificaciones: config.alerts.emailNotifications,
          hora_inicio_minutos: startMinutes,
          hora_fin_minutos: endMinutes,
        }),
      })

      if (!alertsResponse.ok) {
        throw new Error('Error updating alerts config')
      }

      setHasChanges(false)
      toast({
        title: "Configuración guardada",
        description: "Los cambios se han aplicado correctamente.",
      })
    } catch (error) {
      console.error('Error saving config:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetConfig = async () => {
    try {
      setIsLoading(true)
      
      // Recargar tarifas
      const tariffsResponse = await fetch('/api/settings/tariffs')
      const tariffsData = await tariffsResponse.json()
      
      // Recargar configuración de alertas
      const alertsResponse = await fetch('/api/settings/alerts')
      const alertsData = await alertsResponse.json()
      
      // Convertir minutos desde medianoche a horas y minutos
      const startMinutes = Number(alertsData.hora_inicio_minutos) || 0
      const endMinutes = Number(alertsData.hora_fin_minutos) || 0
      
      const startHour = Math.floor(startMinutes / 60)
      const startMinute = startMinutes % 60
      const endHour = Math.floor(endMinutes / 60)
      const endMinute = endMinutes % 60

      const parsedCo2Factor =
        tariffsData && tariffsData.factor_co2 !== undefined && tariffsData.factor_co2 !== null
          ? Number(tariffsData.factor_co2)
          : 0.444

      // Restaurar configuración desde la BD
      setConfig({
        tariff: {
          baseRate: Number(tariffsData.tarifa_pico) || 0,
          valleyRate: Number(tariffsData.tarifa_valle) || 0,
          co2Factor: Number.isFinite(parsedCo2Factor) ? parsedCo2Factor : 0.444,
        },
        alerts: {
          powerThreshold: Number(alertsData.umbral_potencia) || 0,
          powerFactorThreshold: Number(alertsData.umbral_factor_potencia) || 0,
          energyThreshold: Number(alertsData.umbral_energia) || 0,
          emailNotifications: Boolean(alertsData.email_notificaciones),
        },
        chartTimeRange: {
          startHour: startHour,
          startMinute: startMinute,
          endHour: endHour,
          endMinute: endMinute,
        },
      })
      
      setHasChanges(false)
      toast({
        title: "Configuración restablecida",
        description: "Se han restaurado los valores desde la base de datos.",
      })
    } catch (error) {
      console.error('Error resetting config:', error)
      toast({
        title: "Error",
        description: "No se pudo restablecer la configuración.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openAddMachine = () => {
    setMachineForm({
      name: "",
      branchCode: "",
      location: "",
      ctRatio: "",
      maxPower: 0,
      status: "active",
    })
    setIsAddMachineOpen(true)
  }

  const openEditMachine = (machine: Machine) => {
    setEditingMachine(machine)
    setMachineForm({
      name: machine.nombre,
      branchCode: machine.codigo_branch,
      location: '', // Removed location field
      ctRatio: machine.ct_ratio,
      maxPower: machine.potencia_maxima,
      status: machine.estado ? 'active' : 'inactive',
    })
    setIsEditMachineOpen(true)
  }

  const handleSaveMachine = async () => {
    // Basic validation
    if (!machineForm.name || !machineForm.branchCode) {
      toast({
        title: "Error de validación",
        description: "Por favor, complete todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingMachine) {
        // Update existing machine
        const response = await fetch(`/api/machines/${editingMachine.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: machineForm.name,
            codigo_branch: machineForm.branchCode,
            ct_ratio: machineForm.ctRatio,
            potencia_maxima: machineForm.maxPower,
            estado: machineForm.status === 'active',
          }),
        })

        if (!response.ok) {
          throw new Error('Error updating machine')
        }

        const updatedMachine = await response.json()
        
        // Update local state and maintain alphabetical order
        setMachines((prev) => {
          const updatedMachines = prev.map((machine) => (machine.id === editingMachine.id ? updatedMachine : machine))
          return updatedMachines.sort((a: Machine, b: Machine) => a.nombre.localeCompare(b.nombre))
        })
        
        toast({
          title: "Máquina actualizada",
          description: `${machineForm.name} se ha actualizado correctamente.`,
        })
        setIsEditMachineOpen(false)
      } else {
        // Add new machine
        const response = await fetch('/api/machines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: machineForm.name,
            codigo_branch: machineForm.branchCode,
            ct_ratio: machineForm.ctRatio,
            potencia_maxima: machineForm.maxPower,
            estado: machineForm.status === 'active',
          }),
        })

        if (!response.ok) {
          throw new Error('Error creating machine')
        }

        const newMachine = await response.json()
        setMachines((prev) => {
          const updatedMachines = [...prev, newMachine]
          return updatedMachines.sort((a: Machine, b: Machine) => a.nombre.localeCompare(b.nombre))
        })
        
        toast({
          title: "Máquina agregada",
          description: `${machineForm.name} se ha agregado correctamente.`,
        })
        setIsAddMachineOpen(false)
      }
    } catch (error) {
      console.error('Error saving machine:', error)
      toast({
        title: "Error",
        description: "No se pudo guardar la máquina.",
        variant: "destructive",
      })
    }
  }


  const getStatusColor = (estado: boolean) => {
    return estado 
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
  }

  const getStatusText = (estado: boolean) => {
    return estado ? "Activa" : "Inactiva"
  }

  return (
    <div className="p-6 space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Save/Reset Actions */}
          <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {hasChanges ? "Hay cambios sin guardar" : "Configuración actualizada"}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSaveConfig} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* Tariff Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-work-sans">
            <DollarSign className="h-5 w-5" />
            Configuración de Tarifas
          </CardTitle>
          <CardDescription>Configure las tarifas eléctricas para el cálculo de costos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base-rate">Tarifa Base (kWh)</Label>
              <div className="relative">
                <Input
                  id="base-rate"
                  type="number"
                  step="0.01"
                  value={config.tariff.baseRate || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value)
                    handleConfigChange("tariff", "baseRate", Number.isNaN(value) ? 0 : value)
                  }}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  MXN
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="co2-factor">Factor CO₂e (kWh)</Label>
              <Input
                id="co2-factor"
                type="number"
                step="0.001"
                min="0"
                value={
                  config.tariff.co2Factor === null || config.tariff.co2Factor === undefined
                    ? ''
                    : String(config.tariff.co2Factor)
                }
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value)
                  handleConfigChange("tariff", "co2Factor", Number.isNaN(value) ? 0 : value)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Alert Configuration */}
      {/*<Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-work-sans">
            <AlertTriangle className="h-5 w-5" />
            Configuración de Alertas
          </CardTitle>
          <CardDescription>Configure umbrales y notificaciones para alertas automáticas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="power-threshold">Umbral de Potencia (kW)</Label>
              <Input
                id="power-threshold"
                type="number"
                value={config.alerts.powerThreshold || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number.parseInt(e.target.value)
                  handleConfigChange("alerts", "powerThreshold", isNaN(value) ? 0 : value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-threshold">Umbral Factor de Potencia</Label>
              <Input
                id="pf-threshold"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.alerts.powerFactorThreshold || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value)
                  handleConfigChange("alerts", "powerFactorThreshold", isNaN(value) ? 0 : value)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="energy-threshold">Umbral de Energía (kWh)</Label>
              <Input
                id="energy-threshold"
                type="number"
                value={config.alerts.energyThreshold || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number.parseInt(e.target.value)
                  handleConfigChange("alerts", "energyThreshold", isNaN(value) ? 0 : value)
                }}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">Recibir alertas por correo electrónico</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={config.alerts.emailNotifications}
                  onCheckedChange={(checked) => handleConfigChange("alerts", "emailNotifications", checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      */}
      {/* Chart Time Range Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-work-sans">
            <Clock className="h-5 w-5" />
            Horario Laboral
          </CardTitle>
          <CardDescription>Configure el horario laboral que determinará la visualización de datos en las gráficas y los estados de las máquinas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">Hora de Inicio</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-hour">Hora</Label>
                  <Input
                    id="start-hour"
                    type="number"
                    min="0"
                    max="23"
                    value={config.chartTimeRange.startHour}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 0
                      handleConfigChange("chartTimeRange", "startHour", Math.max(0, Math.min(23, value)))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-minute">Minuto</Label>
                  <Input
                    id="start-minute"
                    type="number"
                    min="0"
                    max="59"
                    value={config.chartTimeRange.startMinute}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 0
                      handleConfigChange("chartTimeRange", "startMinute", Math.max(0, Math.min(59, value)))
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Hora actual: {String(config.chartTimeRange.startHour).padStart(2, '0')}:{String(config.chartTimeRange.startMinute).padStart(2, '0')}
              </p>
            </div>
            <div className="space-y-4">
              <Label className="text-base font-medium">Hora de Fin</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="end-hour">Hora</Label>
                  <Input
                    id="end-hour"
                    type="number"
                    min="0"
                    max="23"
                    value={config.chartTimeRange.endHour}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 0
                      handleConfigChange("chartTimeRange", "endHour", Math.max(0, Math.min(23, value)))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-minute">Minuto</Label>
                  <Input
                    id="end-minute"
                    type="number"
                    min="0"
                    max="59"
                    value={config.chartTimeRange.endMinute}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value) || 0
                      handleConfigChange("chartTimeRange", "endMinute", Math.max(0, Math.min(59, value)))
                    }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Hora actual: {String(config.chartTimeRange.endHour).padStart(2, '0')}:{String(config.chartTimeRange.endMinute).padStart(2, '0')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Machine Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-work-sans">
                <Cpu className="h-5 w-5" />
                Gestión de Máquinas
              </CardTitle>
              <CardDescription>Administre las máquinas y equipos del sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código Branch</TableHead>
                <TableHead>CT Ratio</TableHead>
                <TableHead>Potencia Máx</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => (
                <TableRow key={machine.id}>
                  <TableCell className="font-medium">{machine.nombre}</TableCell>
                  <TableCell className="font-mono">{machine.codigo_branch}</TableCell>
                  <TableCell className="font-mono">{machine.ct_ratio}</TableCell>
                  <TableCell>{machine.potencia_maxima} kW</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEditMachine(machine)} className="w-20">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gestión de Correos para Reportes */}
      <ReportEmailsSettings />

      {/* Edit Machine Dialog */}
      <Dialog open={isEditMachineOpen} onOpenChange={setIsEditMachineOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Máquina</DialogTitle>
            <DialogDescription>Modifique la información de la máquina</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-machine-name">Nombre *</Label>
              <Input
                id="edit-machine-name"
                value={machineForm.name}
                onChange={(e) => setMachineForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branch-code">Código Branch *</Label>
              <Input
                id="edit-branch-code"
                value={machineForm.branchCode}
                onChange={(e) => setMachineForm((prev) => ({ ...prev, branchCode: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ct-ratio">CT Ratio</Label>
                <Input
                  id="edit-ct-ratio"
                  value={machineForm.ctRatio}
                  onChange={(e) => setMachineForm((prev) => ({ ...prev, ctRatio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-power">Potencia Máx (kW)</Label>
                <Input
                  id="edit-max-power"
                  type="number"
                  value={machineForm.maxPower}
                  onChange={(e) => setMachineForm((prev) => ({ ...prev, maxPower: Number.parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select
                value={machineForm.status}
                onValueChange={(value: "active" | "inactive") => setMachineForm((prev) => ({ ...prev, status: value }))}
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditMachineOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMachine}>Guardar Cambios</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}
