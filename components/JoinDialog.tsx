"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { getClientId, setBillIdentity } from "@/lib/local-storage"
import type { Bill, Participant } from "@/types/database"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"
import posthog from "posthog-js"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

interface Props {
  bill: Bill
  participants: Participant[]
  onJoined: (participantId: string, name: string) => void
}

export default function JoinDialog({ bill, participants, onJoined }: Props) {
  const [showOther, setShowOther] = useState(false)
  const [otherName, setOtherName] = useState("")
  const [loading, setLoading] = useState(false)
  const myClientId = getClientId()

  const unclaimedParticipants = participants.filter(
    p => p.client_id === NIL_UUID || p.client_id === myClientId
  )
  const claimedByOthers = participants.filter(
    p => p.client_id !== NIL_UUID && p.client_id !== myClientId
  )

  const claimParticipant = async (participant: Participant) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("participants")
        .update({ client_id: myClientId })
        .eq("id", participant.id)
      if (error) throw error
      setBillIdentity(bill.slug, { participantId: participant.id, name: participant.nombre })
      posthog.identify(myClientId, { name: participant.nombre })
      posthog.capture("participant_claimed", {
        bill_slug: bill.slug,
        participant_name: participant.nombre,
      })
      onJoined(participant.id, participant.nombre)
    } catch (e) {
      console.error(e)
      posthog.captureException(e)
      toast.error("No se pudo seleccionar participante")
      setLoading(false)
    }
  }

  const joinAsOther = async () => {
    const trimmed = otherName.trim()
    if (!trimmed) { toast.error("Escribe tu nombre"); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("participants")
        .insert({ bill_id: bill.id, nombre: trimmed, client_id: myClientId })
        .select()
        .single()
      if (error) throw error
      setBillIdentity(bill.slug, { participantId: data.id, name: trimmed })
      posthog.identify(myClientId, { name: trimmed })
      posthog.capture("participant_joined_as_new", {
        bill_slug: bill.slug,
        participant_name: trimmed,
      })
      onJoined(data.id, trimmed)
    } catch (e) {
      console.error(e)
      posthog.captureException(e)
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
          {!showOther ? (
            <>
              {unclaimedParticipants.length > 0 && (
                <div>
                  <p className="mb-3 text-sm text-muted-foreground">¿Quién eres?</p>
                  <div className="flex flex-wrap gap-2">
                    {unclaimedParticipants.map(p => (
                      <button
                        key={p.id}
                        disabled={loading}
                        onClick={() => claimParticipant(p)}
                        className="rounded-full border-2 border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                      >
                        {p.nombre}
                      </button>
                    ))}
                    {claimedByOthers.map(p => (
                      <span
                        key={p.id}
                        title="Ya reclamado"
                        className="cursor-not-allowed rounded-full border-2 border-muted bg-muted/30 px-4 py-2 text-sm font-medium text-muted-foreground line-through"
                      >
                        {p.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground"
                onClick={() => setShowOther(true)}
              >
                <UserPlus className="h-4 w-4" />
                No estoy en la lista
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">¿Cómo te llamas?</p>
                <Input
                  placeholder="Tu nombre"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinAsOther()}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowOther(false)} disabled={loading}>
                  Volver
                </Button>
                <Button className="flex-1 h-11" onClick={joinAsOther} disabled={loading}>
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
