"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { generateSlug } from "@/lib/slug"
import { getSavedBank, saveBank, addOwnedBill, getClientId, setBillIdentity } from "@/lib/local-storage"
import type { Json, DatosTransferencia } from "@/types/database"
import { toast } from "sonner"
import { ArrowRight, Banknote, CalendarRange } from "lucide-react"

const BANCOS = [
  "Banco de Chile", "BancoEstado", "Santander", "BCI", "Itaú", "Scotiabank",
  "BICE", "Falabella", "Ripley", "Consorcio", "Security", "Internacional",
  "Coopeuch", "Otro",
]

const TIPOS_CUENTA = ["Cuenta Vista", "Cuenta Corriente", "Cuenta RUT", "Cuenta de Ahorro"]

export default function CreateBillForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Evento
  const [nombre, setNombre] = useState("")

  // Datos transferencia
  const [creadorNombre, setCreadorNombre] = useState("")
  const [banco, setBanco] = useState("")
  const [tipoCuenta, setTipoCuenta] = useState("")
  const [numero, setNumero] = useState("")
  const [rut, setRut] = useState("")
  const [email, setEmail] = useState("")
  const [alias, setAlias] = useState("")

  useEffect(() => {
    const saved = getSavedBank()
    if (saved) {
      setCreadorNombre(saved.nombre)
      setBanco(saved.banco)
      setTipoCuenta(saved.tipo_cuenta)
      setNumero(saved.numero)
      setRut(saved.rut)
      setEmail(saved.email)
      setAlias(saved.alias)
    }
  }, [])

  const handleCreate = async () => {
    if (!nombre.trim()) {
      toast.error("Ponle un nombre al evento")
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const slug = generateSlug()
      const datosTransferencia: DatosTransferencia = {
        nombre: creadorNombre.trim(),
        banco: banco.trim(),
        tipo_cuenta: tipoCuenta.trim(),
        numero: numero.trim(),
        rut: rut.trim(),
        email: email.trim(),
        alias: alias.trim(),
      }
      const { data: bill, error } = await supabase.from("bills").insert({
        slug,
        nombre: nombre.trim(),
        creador_nombre: creadorNombre.trim() || null,
        datos_transferencia: datosTransferencia as unknown as Json,
      }).select().single()
      if (error || !bill) throw error

      // Auto-registrar al creador como participante
      const participantName = creadorNombre.trim() || nombre.trim()
      const clientId = getClientId()
      const { data: participant, error: pErr } = await supabase
        .from("participants")
        .insert({ bill_id: bill.id, nombre: participantName, client_id: clientId })
        .select().single()
      if (pErr) throw pErr

      saveBank(datosTransferencia)
      addOwnedBill(slug)
      setBillIdentity(slug, { participantId: participant.id, name: participantName })
      router.push(`/b/${slug}`)
    } catch (e) {
      console.error(e)
      toast.error("No se pudo crear la cuenta")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Nombre del evento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" />
            Evento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="nombre">Nombre del evento</Label>
          <Input
            id="nombre"
            placeholder="Ej: Cena cumple Fran"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1.5 h-11"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </CardContent>
      </Card>

      {/* Datos de transferencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" />
            Datos para transferir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="cn">Nombre del titular</Label>
            <Input
              id="cn"
              placeholder="Francisca Bravo"
              value={creadorNombre}
              onChange={(e) => setCreadorNombre(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
          <div>
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              placeholder="12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
          <div>
            <Label>Banco</Label>
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger className="mt-1.5 h-11">
                <SelectValue placeholder="Selecciona banco…" />
              </SelectTrigger>
              <SelectContent>
                {BANCOS.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de cuenta</Label>
            <Select value={tipoCuenta} onValueChange={setTipoCuenta}>
              <SelectTrigger className="mt-1.5 h-11">
                <SelectValue placeholder="Selecciona tipo…" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_CUENTA.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="numero">N° de cuenta</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="francisca@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
          <div>
            <Label htmlFor="alias">Alias</Label>
            <Input
              id="alias"
              placeholder="francisca.bravo (opcional)"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="mt-1.5 h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* CTA fijo */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-md">
          <Button
            size="lg"
            className="h-14 w-full gap-2 rounded-2xl text-base font-semibold"
            onClick={handleCreate}
            disabled={saving}
          >
            {saving ? "Creando…" : (
              <>Crear cuenta y compartir link <ArrowRight className="h-5 w-5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
