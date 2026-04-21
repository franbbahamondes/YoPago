"use client"

import ParticipantChip from "@/components/ParticipantChip"
import { formatCLP } from "@/lib/format"
import { itemEffectiveTotal } from "@/lib/totals"
import { INK, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import { SUCCESS } from "@/lib/semantic-tokens"
import type { Item, Participant, ItemAssignment } from "@/types/database"

interface Props {
  item: Item
  participants: Participant[]
  assignments: ItemAssignment[]
  isOwner: boolean
  myParticipantId: string | null
  onEdit: (item: Item) => void
  onAssignToggle: (itemId: string, participantId: string, currentlyAssigned: boolean) => void
}

export default function ItemRow({
  item, participants, assignments, isOwner, myParticipantId,
  onEdit, onAssignToggle,
}: Props) {
  const assignedIds = new Set(assignments.filter(a => a.item_id === item.id).map(a => a.participant_id))
  const gross = item.precio * item.cantidad
  const effective = itemEffectiveTotal(item)
  const hasDiscount = effective < gross
  const assignedCount = assignedIds.size
  const iAmAssigned = myParticipantId != null && assignedIds.has(myParticipantId)
  const unassigned = assignedCount === 0

  const openEdit = () => {
    if (isOwner) onEdit(item)
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${unassigned ? `${INK}22` : LINE}`,
        padding: 12,
      }}
    >
      {/* Top row: name + price — whole row is tappable for owner to edit */}
      <button
        type="button"
        onClick={openEdit}
        disabled={!isOwner}
        aria-label={isOwner ? `Editar ${item.descripcion}` : undefined}
        className="w-full flex items-start gap-2 text-left"
        style={{
          background: "transparent", border: "none", padding: 0,
          cursor: isOwner ? "pointer" : "default",
        }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2 }}
          >{item.descripcion}</div>
          <div className="mt-0.5" style={{ fontSize: 12, color: MUTED }}>
            {item.cantidad > 1 && <span>{item.cantidad} × {formatCLP(item.precio)}</span>}
            {hasDiscount && (
              <span className="ml-1" style={{ color: SUCCESS, fontWeight: 600 }}>
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
        </div>
      </button>

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
          style={{ fontSize: 12, color: INK, fontWeight: 600, letterSpacing: -0.05 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: INK }} />
          Sin asignar
        </div>
      )}
    </div>
  )
}
