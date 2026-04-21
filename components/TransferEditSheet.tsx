"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { saveBank } from "@/lib/local-storage"
import { transferStatus } from "@/lib/transfer-data"
import TransferFields, { EMPTY_TRANSFER, type TransferFieldsValue } from "@/components/TransferFields"
import type { TransferDataRow } from "@/types/database"
import { INK, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import { ERROR, SURFACE, WARNING_BG, WARNING_BORDER, WARNING_STRONG } from "@/lib/semantic-tokens"
import { toast } from "sonner"
import posthog from "posthog-js"

interface Props {
  open: boolean
  onClose: () => void
  billId: string
  billSlug: string
  initial: TransferDataRow | null
}

function rowToValue(row: TransferDataRow | null): TransferFieldsValue {
  if (!row) return EMPTY_TRANSFER
  return {
    nombre: row.nombre ?? "",
    rut: row.rut ?? "",
    banco: row.banco ?? "",
    tipo_cuenta: row.tipo_cuenta ?? "",
    numero: row.numero ?? "",
    email: row.email ?? "",
    alias: row.alias ?? "",
  }
}

export default function TransferEditSheet({ open, onClose, billId, billSlug, initial }: Props) {
  const [value, setValue] = useState<TransferFieldsValue>(() => rowToValue(initial))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset state when sheet opens with (possibly new) initial data
  useEffect(() => {
    if (open) {
      setValue(rowToValue(initial))
      setConfirmDelete(false)
    }
  }, [open, initial])

  if (!open) return null

  const status = transferStatus(value)
  const isPartial = status === "partial"
  const isEmpty = status === "empty"
  const canSave = !saving && !isPartial && !isEmpty

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        bill_id: billId,
        nombre: value.nombre.trim(),
        rut: value.rut.trim(),
        banco: value.banco.trim(),
        tipo_cuenta: value.tipo_cuenta.trim(),
        numero: value.numero.trim(),
        email: value.email.trim() || null,
        alias: value.alias.trim() || null,
      }
      const { error } = await supabase
        .from("transfer_data")
        .upsert(payload, { onConflict: "bill_id" })
      if (error) throw error

      saveBank({
        nombre: payload.nombre,
        rut: payload.rut,
        banco: payload.banco,
        tipo_cuenta: payload.tipo_cuenta,
        numero: payload.numero,
        email: payload.email ?? undefined,
        alias: payload.alias ?? undefined,
      })

      posthog.capture(initial ? "transfer_data_updated" : "transfer_data_added", { bill_slug: billSlug })
      toast.success("Datos guardados")
      onClose()
    } catch (e) {
      posthog.captureException(e)
      toast.error("No se pudieron guardar los datos")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("transfer_data").delete().eq("bill_id", billId)
      if (error) throw error
      posthog.capture("transfer_data_deleted", { bill_slug: billSlug })
      toast.success("Datos eliminados")
      onClose()
    } catch (e) {
      posthog.captureException(e)
      toast.error("No se pudieron eliminar los datos")
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
            {initial ? "Editar datos" : "Agregar datos"}
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

        <p
          className="mt-2 px-6 text-sm"
          style={{ color: MUTED, letterSpacing: -0.05, lineHeight: 1.5 }}
        >
          Los 5 primeros son obligatorios. Si no quieres datos de transferencia, elimínalos todos.
        </p>

        <div className="px-6 pt-5">
          <TransferFields value={value} onChange={setValue} />
        </div>

        {isPartial && (
          <div
            className="mx-6 mt-5"
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: WARNING_BG,
              border: `1px solid ${WARNING_BORDER}`,
              color: WARNING_STRONG,
              fontSize: 13,
              lineHeight: 1.45,
              letterSpacing: -0.1,
            }}
          >
            Completa nombre, RUT, banco, tipo y número para guardar.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 px-6 pb-8">
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

          {initial && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-2xl"
                  style={{
                    height: 44,
                    background: "#fff",
                    border: `1px solid ${LINE}`,
                    color: TEXT,
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
                    height: 44,
                    background: ERROR,
                    color: "#fff",
                    border: "none",
                    fontSize: 14, fontWeight: 600,
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
                  height: 44,
                  background: "#fff",
                  border: `1px solid ${LINE}`,
                  color: ERROR,
                  fontSize: 14, fontWeight: 500,
                }}
              >
                Eliminar datos
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
