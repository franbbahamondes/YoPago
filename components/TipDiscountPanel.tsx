"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { Bill } from "@/types/database"
import { toast } from "sonner"
import { Percent } from "lucide-react"
import posthog from "posthog-js"

interface Props {
  bill: Bill
  isOwner: boolean
  onUpdated: (bill: Bill) => void
}

export default function TipDiscountPanel({ bill, isOwner, onUpdated }: Props) {
  const [tip, setTip] = useState(String(bill.tip_percent || ""))
  const [discPct, setDiscPct] = useState(String(bill.global_discount_percent || ""))
  const [discAmt, setDiscAmt] = useState(String(bill.global_discount_amount || ""))
  const [savingTip, setSavingTip] = useState(false)
  const [savingDisc, setSavingDisc] = useState(false)

  const saveTip = async () => {
    setSavingTip(true)
    try {
      const supabase = createClient()
      const tip_percent = parseFloat(tip) || 0
      const { data, error } = await supabase
        .from("bills")
        .update({ tip_percent })
        .eq("id", bill.id)
        .select()
        .single()
      if (error) throw error
      posthog.capture("tip_applied", {
        bill_id: bill.id,
        tip_percent,
        is_owner: true,
      })
      onUpdated(data)
      toast.success("Propina guardada")
    } catch (e) { posthog.captureException(e); toast.error("No se pudo guardar") }
    finally { setSavingTip(false) }
  }

  const saveDiscount = async () => {
    setSavingDisc(true)
    try {
      const supabase = createClient()
      const updates = {
        global_discount_percent: parseFloat(discPct) || 0,
        global_discount_amount: parseInt(discAmt.replace(/\D/g, "")) || 0,
      }
      const { data, error } = await supabase
        .from("bills")
        .update(updates)
        .eq("id", bill.id)
        .select()
        .single()
      if (error) throw error
      posthog.capture("global_discount_applied", {
        bill_id: bill.id,
        discount_percent: updates.global_discount_percent,
        discount_amount: updates.global_discount_amount,
        is_owner: isOwner,
      })
      onUpdated(data)
      toast.success("Descuento guardado")
    } catch (e) { posthog.captureException(e); toast.error("No se pudo guardar") }
    finally { setSavingDisc(false) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="h-4 w-4" />
          Propina y descuentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Propina — solo owner puede editar. Invitados ven el valor vigente */}
        {isOwner ? (
          <div className="space-y-2">
            <Label>Propina (%)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="10"
                value={tip}
                onChange={e => setTip(e.target.value)}
                className="h-9"
                type="number"
                min={0}
                max={100}
              />
              <Button size="sm" onClick={saveTip} disabled={savingTip}>
                {savingTip ? "…" : "Aplicar"}
              </Button>
            </div>
          </div>
        ) : (
          Number(bill.tip_percent) > 0 && (
            <div className="text-xs text-muted-foreground">
              Propina: <span className="font-semibold">{bill.tip_percent}%</span> (definida por el organizador)
            </div>
          )
        )}

        {/* Descuento global — editable por todos */}
        <div className="space-y-2">
          <Label>Descuento global</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">%</span>
              <Input
                placeholder="0"
                value={discPct}
                onChange={e => setDiscPct(e.target.value)}
                className="mt-1 h-9"
                type="number"
                min={0}
                max={100}
              />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">$</span>
              <Input
                placeholder="0"
                value={discAmt}
                onChange={e => setDiscAmt(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={saveDiscount} disabled={savingDisc}>
            {savingDisc ? "Guardando…" : "Aplicar descuento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
