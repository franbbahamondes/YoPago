"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { FieldLabel, UnderlineInput } from "@/components/form-primitives"
import { INK, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import { ERROR, SURFACE } from "@/lib/semantic-tokens"
import type { Item } from "@/types/database"
import { toast } from "sonner"
import posthog from "posthog-js"

interface Props {
  open: boolean
  onClose: () => void
  item: Item | null
  onUpdated: (item: Item) => void
  onDeleted: (itemId: string) => void
}

export default function ItemEditSheet({ open, onClose, item, onUpdated, onDeleted }: Props) {
  const [desc, setDesc] = useState("")
  const [price, setPrice] = useState("")
  const [qty, setQty] = useState("1")
  const [discPct, setDiscPct] = useState("")
  const [discAmt, setDiscAmt] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open && item) {
      setDesc(item.descripcion)
      setPrice(String(item.precio))
      setQty(String(item.cantidad))
      setDiscPct(item.descuento_porcentaje ? String(item.descuento_porcentaje) : "")
      setDiscAmt(item.descuento_monto ? String(item.descuento_monto) : "")
      setConfirmDelete(false)
    }
  }, [open, item])

  useEffect(() => {
    if (open && item) {
      posthog.capture("item_edit_sheet_opened", { bill_id: item.bill_id, item_id: item.id })
    }
  }, [open, item])

  if (!open || !item) return null

  const priceNum = parseInt(price.replace(/\D/g, ""), 10)
  const canSave = !saving && desc.trim().length > 0 && priceNum > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("items")
        .update({
          descripcion: desc.trim(),
          precio: priceNum,
          cantidad: Math.max(1, parseInt(qty) || 1),
          descuento_porcentaje: parseFloat(discPct) || 0,
          descuento_monto: parseInt(discAmt.replace(/\D/g, "")) || 0,
        })
        .eq("id", item.id)
        .select()
        .single()
      if (error) throw error
      posthog.capture("item_updated", {
        bill_id: item.bill_id,
        item_id: item.id,
        source: "sheet",
      })
      onUpdated(data)
      toast.success("Ítem actualizado")
      onClose()
    } catch (e) {
      posthog.captureException(e)
      toast.error("No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("items").delete().eq("id", item.id)
      if (error) throw error
      posthog.capture("item_deleted", {
        bill_id: item.bill_id,
        item_id: item.id,
        source: "sheet",
      })
      onDeleted(item.id)
      toast.success("Ítem eliminado")
      onClose()
    } catch (e) {
      posthog.captureException(e)
      toast.error("No se pudo eliminar")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(10,10,10,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl"
        style={{ background: "#fff", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2
            style={{
              fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
              fontSize: 26, fontWeight: 700, letterSpacing: -0.6,
              lineHeight: 1.05, color: TEXT, margin: 0,
            }}
          >
            Editar ítem
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: SURFACE, border: "none", color: TEXT }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 pt-6">
          <div>
            <FieldLabel>Descripción</FieldLabel>
            <UnderlineInput value={desc} onChange={setDesc} placeholder="Coca-Cola" autoFocus />
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1.4 }}>
              <FieldLabel>Precio unitario</FieldLabel>
              <UnderlineInput value={price} onChange={setPrice} inputMode="numeric" placeholder="3500" />
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Cantidad</FieldLabel>
              <UnderlineInput value={qty} onChange={setQty} inputMode="numeric" placeholder="1" />
            </div>
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <FieldLabel>Desc. %</FieldLabel>
              <UnderlineInput value={discPct} onChange={setDiscPct} inputMode="numeric" placeholder="0" />
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Desc. $</FieldLabel>
              <UnderlineInput value={discAmt} onChange={setDiscAmt} inputMode="numeric" placeholder="0" />
            </div>
          </div>

          <div style={{ fontSize: 12, color: MUTED, letterSpacing: -0.05, lineHeight: 1.5 }}>
            Usa solo uno de los descuentos: porcentaje o monto fijo.
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-2 px-6 pb-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl"
            style={{
              height: 52,
              background: canSave ? INK : "#D1D5DB",
              color: "#fff",
              fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
              border: "none",
              cursor: canSave ? "pointer" : "default",
              boxShadow: canSave ? "0 8px 20px -8px rgba(55,48,163,0.5)" : "none",
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>

          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-2xl"
                style={{
                  height: 44, background: "#fff",
                  border: `1px solid ${LINE}`, color: TEXT,
                  fontSize: 14, fontWeight: 500,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-2xl"
                style={{
                  height: 44, background: ERROR, color: "#fff",
                  border: "none", fontSize: 14, fontWeight: 600,
                }}
              >
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-2xl"
              style={{
                height: 44, background: "#fff",
                border: `1px solid ${LINE}`, color: ERROR,
                fontSize: 14, fontWeight: 500,
              }}
            >
              Eliminar ítem
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
