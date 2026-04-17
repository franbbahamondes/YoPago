import type { Item, Participant, ItemAssignment } from "@/types/database"

export type ParticipantTotal = {
  participant: Participant
  subtotal: number
  discountShare: number
  tipShare: number
  total: number
}

export function itemEffectiveTotal(item: Item): number {
  const gross = Number(item.precio) * (item.cantidad ?? 1)
  const pct = Number(item.descuento_porcentaje ?? 0)
  const amt = Number(item.descuento_monto ?? 0)
  const afterPct = gross - (gross * pct) / 100
  return Math.max(0, afterPct - amt)
}

export function computeTotals(args: {
  items: Item[]
  participants: Participant[]
  assignments: ItemAssignment[]
  tipPercent: number
  globalDiscountAmount: number
  globalDiscountPercent: number
}): {
  subtotal: number
  globalDiscount: number
  netSubtotal: number
  tip: number
  total: number
  perPerson: ParticipantTotal[]
  unassignedTotal: number
} {
  const { items, participants, assignments, tipPercent, globalDiscountAmount, globalDiscountPercent } = args

  const subtotal = items.reduce((s, i) => s + itemEffectiveTotal(i), 0)

  const perPersonSubtotal = new Map<string, number>()
  participants.forEach((p) => perPersonSubtotal.set(p.id, 0))
  let unassignedTotal = 0

  for (const item of items) {
    const assigned = assignments.filter((a) => a.item_id === item.id)
    const total = itemEffectiveTotal(item)
    if (assigned.length === 0) {
      unassignedTotal += total
      continue
    }
    const share = total / assigned.length
    for (const a of assigned) {
      perPersonSubtotal.set(a.participant_id, (perPersonSubtotal.get(a.participant_id) ?? 0) + share)
    }
  }

  const globalDiscount = Math.min(
    subtotal,
    (globalDiscountAmount || 0) + (subtotal * (globalDiscountPercent || 0)) / 100
  )
  const netSubtotal = subtotal - globalDiscount
  const tip = (netSubtotal * (tipPercent || 0)) / 100
  const assignedSubtotal = subtotal - unassignedTotal

  const perPerson: ParticipantTotal[] = participants.map((p) => {
    const sub = perPersonSubtotal.get(p.id) ?? 0
    const proportion = assignedSubtotal > 0 ? sub / assignedSubtotal : 0
    const discountShare = proportion * globalDiscount
    const netSub = sub - discountShare
    const tipShare = proportion * tip
    return { participant: p, subtotal: sub, discountShare, tipShare, total: netSub + tipShare }
  })

  return { subtotal, globalDiscount, netSubtotal, tip, total: netSubtotal + tip, perPerson, unassignedTotal }
}
