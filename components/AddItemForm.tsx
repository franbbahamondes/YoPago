"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Item } from "@/types/database"
import { toast } from "sonner"
import posthog from "posthog-js"
import { INK, INK_SOFT, MUTED, LINE } from "@/lib/design-tokens"

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5"
        style={{
          height: 52, borderRadius: 16, padding: "0 14px",
          background: "#fff", border: `1px dashed ${LINE}`,
          color: INK, fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
        }}
      >
        <span
          style={{
            width: 22, height: 22, borderRadius: 999,
            background: INK_SOFT, color: INK,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14,
          }}
        >+</span>
        Agregar ítem
      </button>
    )
  }

  return (
    <div
      style={{
        background: "#fff", borderRadius: 16, padding: 12,
        border: `1.5px solid ${INK}`,
      }}
    >
      <Input
        placeholder="Nombre del ítem"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        className="h-10 mb-2"
        autoFocus
      />
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: MUTED }}>$</span>
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
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="flex-1 disabled:opacity-60"
          style={{
            height: 44, borderRadius: 12, background: INK, color: "#fff",
            fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
          }}
        >
          {saving ? "Agregando…" : "Agregar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4"
          style={{
            height: 44, borderRadius: 12,
            background: "#fff", border: `1px solid ${LINE}`,
            color: MUTED, fontSize: 13, fontWeight: 500,
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
