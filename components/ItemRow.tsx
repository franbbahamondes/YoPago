"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ParticipantChip from "@/components/ParticipantChip"
import { createClient } from "@/lib/supabase/client"
import { formatCLP } from "@/lib/format"
import { itemEffectiveTotal } from "@/lib/totals"
import type { Item, Participant, ItemAssignment } from "@/types/database"
import { toast } from "sonner"
import { Pencil, Trash2, Check, X } from "lucide-react"

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
  item, participants, assignments, isOwner, myParticipantId, onDeleted, onUpdated, onAssignToggle,
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
      <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-muted/30 p-3">
        <Input value={desc} onChange={e => setDesc(e.target.value)} className="h-9" placeholder="Nombre" />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input value={price} onChange={e => setPrice(e.target.value)} className="h-9 pl-6" placeholder="Precio" />
          </div>
          <Input value={qty} onChange={e => setQty(e.target.value)} className="h-9 w-16" type="number" min={1} placeholder="Cant." />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Descuento %</span>
            <Input value={discPct} onChange={e => setDiscPct(e.target.value)} className="h-9 mt-0.5" type="number" min={0} max={100} placeholder="0" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">Descuento $</span>
            <Input value={discAmt} onChange={e => setDiscAmt(e.target.value)} className="h-9 mt-0.5" placeholder="0" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            <Check className="h-3.5 w-3.5" /> Guardar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDiscPct(String(item.descuento_porcentaje || "")); setDiscAmt(String(item.descuento_monto || "")) }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-tight truncate">{item.descripcion}</p>
          <p className="text-sm text-muted-foreground">
            {item.cantidad > 1 && <span>{item.cantidad} × {formatCLP(item.precio)} = </span>}
            {hasDiscount ? (
              <>
                <span className="line-through opacity-50">{formatCLP(gross)}</span>
                {" "}
                <span className="font-medium text-green-700">{formatCLP(effective)}</span>
                {" "}
                <span className="text-xs text-green-600">
                  ({item.descuento_porcentaje > 0 ? `-${item.descuento_porcentaje}%` : `-${formatCLP(item.descuento_monto)}`})
                </span>
              </>
            ) : (
              <span>{formatCLP(gross)}</span>
            )}
          </p>
        </div>
        {isOwner && (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {participants.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {participants.map(p => (
            <ParticipantChip
              key={p.id}
              participant={p}
              selected={assignedIds.has(p.id)}
              onClick={() => onAssignToggle(item.id, p.id, assignedIds.has(p.id))}
            />
          ))}
          {assignedIds.size > 0 && (
            <span className="text-xs text-muted-foreground self-center ml-1">
              {formatCLP(effective / assignedIds.size)} c/u
            </span>
          )}
        </div>
      )}
    </div>
  )
}
