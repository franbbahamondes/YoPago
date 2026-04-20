"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import ParticipantChip from "@/components/ParticipantChip"
import { createClient } from "@/lib/supabase/client"
import { formatCLP } from "@/lib/format"
import { itemEffectiveTotal } from "@/lib/totals"
import { INK, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import type { Item, Participant, ItemAssignment } from "@/types/database"
import { toast } from "sonner"

interface Props {
  item: Item
  participants: Participant[]
  assignments: ItemAssignment[]
  isOwner: boolean
  myParticipantId: string | null
  onDeleted: (itemId: string) => void
  onUpdated: (item: Item) => void
  onAssignToggle: (itemId: string, participantId: string, currentlyAssigned: boolean) => void
}

export default function ItemRow({
  item, participants, assignments, isOwner, myParticipantId,
  onDeleted, onUpdated, onAssignToggle,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(item.descripcion)
  const [price, setPrice] = useState(String(item.precio))
  const [qty, setQty] = useState(String(item.cantidad))
  const [discPct, setDiscPct] = useState(String(item.descuento_porcentaje || ""))
  const [discAmt, setDiscAmt] = useState(String(item.descuento_monto || ""))
  const [saving, setSaving] = useState(false)

  const assignedIds = new Set(assignments.filter(a => a.item_id === item.id).map(a => a.participant_id))
  const gross = item.precio * item.cantidad
  const effective = itemEffectiveTotal(item)
  const hasDiscount = effective < gross
  const assignedCount = assignedIds.size
  const iAmAssigned = myParticipantId != null && assignedIds.has(myParticipantId)
  const unassigned = assignedCount === 0

  const handleSave = async () => {
    const p = parseInt(price.replace(/\D/g, ""), 10)
    if (!desc.trim() || !p) { toast.error("Datos inválidos"); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("items")
        .update({
          descripcion: desc.trim(),
          precio: p,
          cantidad: parseInt(qty) || 1,
          descuento_porcentaje: parseFloat(discPct) || 0,
          descuento_monto: parseInt(discAmt.replace(/\D/g, "")) || 0,
        })
        .eq("id", item.id)
        .select()
        .single()
      if (error) throw error
      onUpdated(data)
      setEditing(false)
    } catch { toast.error("No se pudo guardar") }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${item.descripcion}"?`)) return
    try {
      const supabase = createClient()
      await supabase.from("items").delete().eq("id", item.id)
      onDeleted(item.id)
    } catch { toast.error("No se pudo eliminar") }
  }

  if (editing) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: `1.5px solid ${INK}`,
          padding: 12,
        }}
      >
        <Input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="h-10 mb-2"
          placeholder="Nombre"
          style={{ borderColor: LINE }}
        />
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: MUTED }}>$</span>
            <Input value={price} onChange={e => setPrice(e.target.value)} className="h-10 pl-6" placeholder="Precio" />
          </div>
          <Input value={qty} onChange={e => setQty(e.target.value)} className="h-10 w-16" type="number" min={1} placeholder="Cant." />
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2 }}>Desc. %</span>
            <Input value={discPct} onChange={e => setDiscPct(e.target.value)} className="h-9 mt-1" type="number" min={0} max={100} placeholder="0" />
          </div>
          <div className="flex-1">
            <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2 }}>Desc. $</span>
            <Input value={discAmt} onChange={e => setDiscAmt(e.target.value)} className="h-9 mt-1" placeholder="0" />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 disabled:opacity-60"
            style={{
              height: 44, borderRadius: 12, background: INK, color: "#fff",
              fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
            }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4"
            style={{
              height: 44, borderRadius: 12,
              background: "#fff", border: `1px solid ${LINE}`,
              color: "#B91C1C", fontSize: 13, fontWeight: 500,
            }}
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
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

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${unassigned ? "#FDE68A" : LINE}`,
        padding: 12,
      }}
    >
      {/* Top row: name + price (+ edit pencil for owner) */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2 }}
          >{item.descripcion}</div>
          <div className="mt-0.5" style={{ fontSize: 12, color: MUTED }}>
            {item.cantidad > 1 && <span>{item.cantidad} × {formatCLP(item.precio)}</span>}
            {hasDiscount && (
              <span className="ml-1" style={{ color: "#047857", fontWeight: 600 }}>
                · {item.descuento_porcentaje > 0 ? `-${item.descuento_porcentaje}%` : `-${formatCLP(item.descuento_monto)}`}
              </span>
            )}
          </div>
        </div>
        <div
          className="shrink-0 flex items-center gap-2"
          style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2, fontVariantNumeric: "tabular-nums" }}
        >
          {hasDiscount && (
            <span className="line-through opacity-40" style={{ fontSize: 12, color: MUTED }}>{formatCLP(gross)}</span>
          )}
          <span>{formatCLP(effective)}</span>
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar"
              className="shrink-0"
              style={{
                width: 28, height: 28, borderRadius: 999,
                background: "#F3F4F6",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginLeft: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 10.5L10 2.5l1.5 1.5L3.5 12H2v-1.5z" stroke={MUTED} strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chip row */}
      {participants.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {participants.map(p => (
            <ParticipantChip
              key={p.id}
              participant={p}
              selected={assignedIds.has(p.id)}
              isMe={p.id === myParticipantId}
              onClick={() => onAssignToggle(item.id, p.id, assignedIds.has(p.id))}
            />
          ))}
        </div>
      )}

      {/* Footer hint */}
      {assignedCount > 0 && (
        <div
          className="mt-2"
          style={{ fontSize: 12, color: MUTED, letterSpacing: -0.05 }}
        >
          {formatCLP(effective / assignedCount)} c/u
          {iAmAssigned && (
            <span style={{ color: INK, fontWeight: 600 }}> · te toca a ti</span>
          )}
        </div>
      )}
      {unassigned && (
        <div
          className="mt-2 flex items-center gap-1.5"
          style={{ fontSize: 12, color: "#B45309", fontWeight: 600, letterSpacing: -0.05 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "#F59E0B" }} />
          Sin asignar
        </div>
      )}
    </div>
  )
}
