"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { getClientId, setBillIdentity } from "@/lib/local-storage"
import type { Bill } from "@/types/database"
import { toast } from "sonner"

interface Props {
  bill: Bill
  onJoined: (participantId: string, name: string) => void
}

export default function JoinDialog({ bill, onJoined }: Props) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Escribe tu nombre")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const clientId = getClientId()
      const { data, error } = await supabase
        .from("participants")
        .insert({ bill_id: bill.id, nombre: trimmed, client_id: clientId })
        .select()
        .single()
      if (error) throw error
      setBillIdentity(bill.slug, { participantId: data.id, name: trimmed })
      onJoined(data.id, trimmed)
    } catch (e) {
      console.error(e)
      toast.error("No se pudo unir a la cuenta")
      setLoading(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bienvenido/a a</DialogTitle>
          <DialogDescription className="text-base font-semibold text-foreground">{bill.nombre}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="join-name">¿Cómo te llamas?</Label>
            <Input
              id="join-name"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="mt-1.5 h-11"
              autoFocus
            />
          </div>
          <Button
            className="h-12 w-full text-base"
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? "Entrando…" : "Entrar a la cuenta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
