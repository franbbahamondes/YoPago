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
  onUpdated: (bill: Bill) => void
}

export default function TipDiscountPanel({ bill, onUpdated }: Props) {
  const [tip, setTip] = useState(String(bill.tip_percent || ""))
  const [discPct, setDiscPct] = useState(String(bill.global_discount_percent || ""))
  const [discAmt, setDiscAmt] = useState(String(bill.global_discount_amount || ""))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const updates = {
        tip_percent: parseFloat(tip) || 0,
        global_discount_percent: parseFloat(discPct) || 0,
        global_discount_amount: parseInt(discAmt.replace(/\D/g, "")) || 0,
      }
      const { data, error } = await supabase.from("bills").update(updates).eq("id", bill.id).select().single()
      if (error) throw error
      posthog.capture("tip_discount_applied", {
        bill_id: bill.id,
        tip_percent: updates.tip_percent,
        discount_percent: updates.global_discount_percent,
        discount_amount: updates.global_discount_amount,
      })
      onUpdated(data)
      toast.success("Guardado")
    } catch (e) { posthog.captureException(e); toast.error("No se pudo guardar") }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="h-4 w-4" />
          Propina y descuentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Propina (%)</Label>
            <Input
              placeholder="10"
              value={tip}
              onChange={e => setTip(e.target.value)}
              className="mt-1.5 h-9"
              type="number"
              min={0}
              max={100}
            />
          </div>
          <div>
            <Label>Desc. global (%)</Label>
            <Input
              placeholder="0"
              value={discPct}
              onChange={e => setDiscPct(e.target.value)}
              className="mt-1.5 h-9"
              type="number"
              min={0}
              max={100}
            />
          </div>
        </div>
        <div>
          <Label>Desc. global ($)</Label>
          <Input
            placeholder="0"
            value={discAmt}
            onChange={e => setDiscAmt(e.target.value)}
            className="mt-1.5 h-9"
          />
        </div>
        <Button size="sm" className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Aplicar"}
        </Button>
      </CardContent>
    </Card>
  )
}
