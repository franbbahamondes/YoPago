"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Item } from "@/types/database"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import posthog from "posthog-js"

interface Props {
  billId: string
  nextOrden: number
  onAdded: (item: Item) => void
}

export default function AddItemForm({ billId, nextOrden, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [cantidad, setCantidad] = useState("1")
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!descripcion.trim()) { toast.error("Escribe el nombre del ítem"); return }
    const p = parseInt(precio.replace(/\D/g, ""), 10)
    if (!p || p <= 0) { toast.error("El precio debe ser mayor a 0"); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("items")
        .insert({ bill_id: billId, descripcion: descripcion.trim(), precio: p, cantidad: parseInt(cantidad) || 1, orden: nextOrden })
        .select()
        .single()
      if (error) throw error
      posthog.capture("item_added_manually", {
        bill_id: billId,
        item_name: descripcion.trim(),
        price: p,
        quantity: parseInt(cantidad) || 1,
      })
      onAdded(data)
      setDescripcion("")
      setPrecio("")
      setCantidad("1")
      setOpen(false)
    } catch (e) {
      console.error(e)
      posthog.captureException(e)
      toast.error("No se pudo agregar el ítem")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" className="w-full justify-start gap-2 text-primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Agregar ítem
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <Input
        placeholder="Nombre del ítem"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="h-10"
        autoFocus
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="h-10 pl-6"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Input
          placeholder="Cant."
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="h-10 w-16"
          type="number"
          min={1}
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleAdd} disabled={saving}>
          {saving ? "Agregando…" : "Agregar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  )
}
