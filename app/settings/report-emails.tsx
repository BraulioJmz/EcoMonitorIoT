"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Mail, Plus, Trash2, Save, X } from "lucide-react"

interface ReportEmail {
  id: number
  email: string
  nombre: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export default function ReportEmailsSettings() {
  const [emails, setEmails] = useState<ReportEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState({ email: "", nombre: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ email: "", nombre: "", activo: true })
  const { toast } = useToast()

  useEffect(() => {
    loadEmails()
  }, [])

  const loadEmails = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/settings/report-emails')
      if (!response.ok) throw new Error('Error al cargar correos')
      const data = await response.json()
      setEmails(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los correos",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newEmail.email.trim()) {
      toast({
        title: "Error",
        description: "El correo es requerido",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/settings/report-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmail)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al agregar correo')
      }

      toast({
        title: "Éxito",
        description: "Correo agregado correctamente"
      })

      setNewEmail({ email: "", nombre: "" })
      setIsAdding(false)
      loadEmails()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleUpdate = async (id: number) => {
    try {
      const response = await fetch(`/api/settings/report-emails/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar correo')
      }

      toast({
        title: "Éxito",
        description: "Correo actualizado correctamente"
      })

      setEditingId(null)
      loadEmails()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este correo?')) return

    try {
      const response = await fetch(`/api/settings/report-emails/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar correo')

      toast({
        title: "Éxito",
        description: "Correo eliminado correctamente"
      })

      loadEmails()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const startEdit = (email: ReportEmail) => {
    setEditingId(email.id)
    setEditForm({
      email: email.email,
      nombre: email.nombre || "",
      activo: email.activo
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Destinatarios de Reportes Diarios
            </CardTitle>
            <CardDescription>
              Gestiona los correos que recibirán el reporte diario de consumo eléctrico
            </CardDescription>
          </div>
          <Button onClick={() => setIsAdding(true)} size="sm" disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Correo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold mb-3">Nuevo Correo</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-email">Correo Electrónico *</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={newEmail.email}
                  onChange={(e) => setNewEmail({ ...newEmail, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-nombre">Nombre (opcional)</Label>
                <Input
                  id="new-nombre"
                  placeholder="Nombre del destinatario"
                  value={newEmail.nombre}
                  onChange={(e) => setNewEmail({ ...newEmail, nombre: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                <Button onClick={() => {
                  setIsAdding(false)
                  setNewEmail({ email: "", nombre: "" })
                }} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-muted-foreground">Cargando correos...</p>
        ) : emails.length === 0 ? (
          <p className="text-muted-foreground">No hay correos configurados</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell>
                    {editingId === email.id ? (
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    ) : (
                      <span className="font-mono text-sm">{email.email}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === email.id ? (
                      <Input
                        value={editForm.nombre}
                        onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      />
                    ) : (
                      <span>{email.nombre || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === email.id ? (
                      <Switch
                        checked={editForm.activo}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, activo: checked })}
                      />
                    ) : (
                      <Badge variant={email.activo ? "default" : "secondary"}>
                        {email.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === email.id ? (
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => handleUpdate(email.id)} size="sm">
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => startEdit(email)} variant="outline" size="sm">
                          Editar
                        </Button>
                        <Button onClick={() => handleDelete(email.id)} variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
