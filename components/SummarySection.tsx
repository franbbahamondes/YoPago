"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCLP, colorFor, initials } from "@/lib/format"
import { computeTotals } from "@/lib/totals"
import type { Bill, Item, Participant, ItemAssignment } from "@/types/database"
import { Calculator } from "lucide-react"

interface Props {
  bill: Bill
  items: Item[]
  participants: Participant[]
  assignments: ItemAssignment[]
  myParticipantId: string | null
}

export default function SummarySection({ bill, items, participants, assignments, myParticipantId }: Props) {
  if (participants.length === 0 || items.length === 0) return null

  const { perPerson, total, unassignedTotal, tip } = computeTotals({
    items,
    participants,
    assignments,
    tipPercent: Number(bill.tip_percent),
    globalDiscountAmount: Number(bill.global_discount_amount),
    globalDiscountPercent: Number(bill.global_discount_percent),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {perPerson.map(({ participant, total: t, subtotal }) => {
          const isMe = participant.id === myParticipantId
          const color = colorFor(participant.id)
          return (
            <div
              key={participant.id}
              className={`flex items-center gap-3 rounded-lg p-2.5 ${isMe ? "bg-primary/8 ring-1 ring-primary/20" : "bg-muted/40"}`}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initials(participant.nombre)}
              </div>
              <span className="flex-1 font-medium">
                {participant.nombre}
                {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
              </span>
              <span className={`font-semibold tabular-nums ${subtotal === 0 ? "text-muted-foreground" : ""}`}>
                {subtotal === 0 ? "—" : formatCLP(Math.round(t))}
              </span>
            </div>
          )
        })}

        <div className="border-t pt-2 text-sm text-muted-foreground">
          {unassignedTotal > 0 && (
            <div className="flex justify-between">
              <span>Sin asignar</span>
              <span className="font-medium text-orange-600">{formatCLP(unassignedTotal)}</span>
            </div>
          )}
          {tip > 0 && (
            <div className="flex justify-between">
              <span>Propina ({bill.tip_percent}%)</span>
              <span>{formatCLP(tip)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-foreground">
            <span>Total</span>
            <span>{formatCLP(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
