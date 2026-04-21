"use client"

import { useEffect, useState } from "react"
import { FieldLabel, UnderlineInput } from "@/components/form-primitives"
import { INK, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import { ERROR, SURFACE } from "@/lib/semantic-tokens"

export interface ExtractedDraft {
  name: string
  price: number
  quantity: number
  discount_amount?: number
}

interface Props {
  open: boolean
  onClose: () => void
  draft: ExtractedDraft | null
  onSave: (next: ExtractedDraft) => void
  onDelete: () => void
}

export default function ExtractedItemEditSheet({ open, onClose, draft, onSave, onDelete }: Props) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [qty, setQty] = useState("1")
  const [discAmt, setDiscAmt] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open && draft) {
      setName(draft.name)
      setPrice(String(draft.price))
      setQty(String(draft.quantity))
      setDiscAmt(draft.discount_amount ? String(draft.discount_amount) : "")
      setConfirmDelete(false)
    }
  }, [open, draft])

  if (!open || !draft) return null

  const priceNum = parseInt(price.replace(/\D/g, ""), 10)
  const canSave = name.trim().length > 0 && priceNum > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      name: name.trim(),
      price: priceNum,
      quantity: Math.max(1, parseInt(qty) || 1),
      discount_amount: parseInt(discAmt.replace(/\D/g, "")) || 0,
    })
    onClose()
  }

  const handleDelete = () => {
    onDelete()
    onClose()
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
            <UnderlineInput value={name} onChange={setName} placeholder="Coca-Cola" autoFocus />
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

          <div>
            <FieldLabel>Descuento $</FieldLabel>
            <UnderlineInput value={discAmt} onChange={setDiscAmt} inputMode="numeric" placeholder="0" />
          </div>

          <div style={{ fontSize: 12, color: MUTED, letterSpacing: -0.05, lineHeight: 1.5 }}>
            Los cambios se guardarán al tocar "Confirmar y asignar".
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
            Guardar
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
                className="flex-1 rounded-2xl"
                style={{
                  height: 44, background: ERROR, color: "#fff",
                  border: "none", fontSize: 14, fontWeight: 600,
                }}
              >
                Sí, eliminar
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
