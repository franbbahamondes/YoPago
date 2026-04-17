"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
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
import { ArrowRight, Banknote, CalendarRange, Users, Plus, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

const BANCOS = [
  "Banco de Chile", "BancoEstado", "Santander", "BCI", "Itaú", "Scotiabank",
  "BICE", "Falabella", "Ripley", "Consorcio", "Security", "Internacional",
  "Coopeuch", "Otro",
]
const TIPOS_CUENTA = ["Cuenta Vista", "Cuenta Corriente", "Cuenta RUT", "Cuenta de Ahorro"]

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export default function CreateBillForm() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [nombre, setNombre] = useState("")
  const [otrosParticipantes, setOtrosParticipantes] = useState<string[]>([""])

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

  const addOtro = () => setOtrosParticipantes(p => [...p, ""])
  const removeOtro = (i: number) => setOtrosParticipantes(p => p.filter((_, idx) => idx !== i))
  const updateOtro = (i: number, v: string) => setOtrosParticipantes(p => p.map((x, idx) => idx === i ? v : x))

  const handleCreate = async () => {
    if (!nombre.trim()) { toast.error("Ponle un nombre al evento"); return }
    const creadorName = creadorNombre.trim() || "Yo"
    const otros = otrosParticipantes.map(p => p.trim()).filter(Boolean)

    setSaving(true)
    try {
      const supabase = createClient()
      const slug = generateSlug()
      const clientId = getClientId()

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

      // Insertar creador como participante con su client_id real
      const { data: creadorParticipant, error: pErr } = await supabase
        .from("participants")
        .insert({ bill_id: bill.id, nombre: creadorName, client_id: clientId })
        .select().single()
      if (pErr) throw pErr

      // Insertar otros participantes con NIL UUID (no reclamados aún)
      if (otros.length > 0) {
        const { error: otrosErr } = await supabase.from("participants").insert(
          otros.map(n => ({ bill_id: bill.id, nombre: n, client_id: NIL_UUID }))
        )
        if (otrosErr) throw otrosErr
      }

      saveBank(datosTransferencia)
      addOwnedBill(slug)
      setBillIdentity(slug, { participantId: creadorParticipant.id, name: creadorName })

      posthog.identify(clientId, {
        name: creadorName,
        ...(email.trim() ? { email: email.trim() } : {}),
      })
      posthog.capture("bill_created", {
        bill_slug: slug,
        event_name: nombre.trim(),
        participant_count: 1 + otros.length,
        has_transfer_data: !!(banco.trim() || numero.trim()),
        has_pre_registered_participants: otros.length > 0,
        marketing_opt_in: termsAccepted,
      })

      router.push(`/b/${slug}`)
    } catch (e) {
      console.error(e)
      posthog.captureException(e)
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
            <CalendarRange className="h-4 w-4" /> Evento
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
          />
        </CardContent>
      </Card>

      {/* Participantes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> ¿Quiénes van?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Creador — siempre el primero */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Tu nombre"
              value={creadorNombre}
              onChange={(e) => setCreadorNombre(e.target.value)}
              className="h-11"
            />
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Tú</span>
          </div>

          {/* Otros participantes */}
          {otrosParticipantes.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={`Persona ${i + 2}`}
                value={p}
                onChange={(e) => updateOtro(i, e.target.value)}
                className="h-11"
              />
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={() => removeOtro(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="ghost" onClick={addOtro} className="w-full justify-start gap-2 text-primary">
            <Plus className="h-4 w-4" /> Agregar persona
          </Button>
        </CardContent>
      </Card>

      {/* Datos de transferencia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" /> Datos para transferir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="rut">RUT</Label>
            <Input id="rut" placeholder="12.345.678-9" value={rut} onChange={(e) => setRut(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label>Banco</Label>
            <Select value={banco} onValueChange={setBanco}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecciona banco…" /></SelectTrigger>
              <SelectContent>{BANCOS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de cuenta</Label>
            <Select value={tipoCuenta} onValueChange={setTipoCuenta}>
              <SelectTrigger className="mt-1.5 h-11"><SelectValue placeholder="Selecciona tipo…" /></SelectTrigger>
              <SelectContent>{TIPOS_CUENTA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="numero">N° de cuenta</Label>
            <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="francisca@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="alias">Alias</Label>
            <Input id="alias" placeholder="francisca.bravo (opcional)" value={alias} onChange={(e) => setAlias(e.target.value)} className="mt-1.5 h-11" />
          </div>
        </CardContent>
      </Card>

      {/* CTA fijo */}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-md space-y-3">
          <Button
            size="lg"
            className="h-14 w-full gap-2 rounded-2xl text-base font-semibold"
            onClick={handleCreate}
            disabled={saving || !termsAccepted}
          >
            {saving ? "Creando…" : <> Crear cuenta y compartir link <ArrowRight className="h-5 w-5" /></>}
          </Button>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-snug">
              Acepto los{" "}
              <a href="/terminos" target="_blank" className="underline underline-offset-2 hover:text-foreground">
                términos de uso
              </a>{" "}
              y autorizo a YoPago a usar mis datos de contacto para enviarte novedades y comunicaciones del servicio.
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
