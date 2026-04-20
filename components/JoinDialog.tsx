"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { getClientId, setBillIdentity } from "@/lib/local-storage"
import type { Bill, Participant } from "@/types/database"
import { toast } from "sonner"
import posthog from "posthog-js"
import { INK, INK_SOFT, TEXT, MUTED, LINE } from "@/lib/design-tokens"

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
      <DialogContent
        className="max-w-sm p-0 gap-0 overflow-hidden"
        style={{ background: "#fff", borderRadius: 24 }}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="p-6">
          <DialogHeader className="space-y-2">
            <DialogDescription
              style={{
                fontSize: 11, fontWeight: 600, color: MUTED,
                textTransform: "uppercase", letterSpacing: 1.4,
              }}
            >
              Bienvenido/a
            </DialogDescription>
            <DialogTitle
              style={{
                fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
                fontSize: 28, fontWeight: 700, letterSpacing: -0.7,
                lineHeight: 1.05, color: TEXT,
              }}
            >
              {bill.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {!showOther ? (
              <>
                {unclaimedParticipants.length > 0 && (
                  <div>
                    <p className="mb-3" style={{ fontSize: 13, color: MUTED, letterSpacing: -0.05 }}>
                      ¿Quién eres?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unclaimedParticipants.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={loading}
                          onClick={() => claimParticipant(p)}
                          className="disabled:opacity-60"
                          style={{
                            padding: "9px 16px", borderRadius: 999,
                            background: INK_SOFT,
                            border: `1.5px solid ${INK}`,
                            color: INK, fontSize: 14, fontWeight: 600, letterSpacing: -0.05,
                          }}
                        >
                          {p.nombre}
                        </button>
                      ))}
                      {claimedByOthers.map(p => (
                        <span
                          key={p.id}
                          title="Ya reclamado"
                          style={{
                            padding: "9px 16px", borderRadius: 999,
                            background: "#fff",
                            border: `1px solid ${LINE}`,
                            color: MUTED, fontSize: 14, fontWeight: 500,
                            textDecoration: "line-through", cursor: "not-allowed",
                          }}
                        >
                          {p.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowOther(true)}
                  className="w-full inline-flex items-center justify-center gap-2"
                  style={{
                    height: 44, borderRadius: 12,
                    background: "#fff", border: `1px dashed ${LINE}`,
                    color: MUTED, fontSize: 14, fontWeight: 500, letterSpacing: -0.05,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 3v8M3 7h8" stroke={MUTED} strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                  No estoy en la lista
                </button>
              </>
            ) : (
              <>
                <div>
                  <p
                    className="mb-2"
                    style={{
                      fontSize: 11, fontWeight: 600, color: MUTED,
                      textTransform: "uppercase", letterSpacing: 1.4,
                    }}
                  >
                    ¿Cómo te llamas?
                  </p>
                  <Input
                    placeholder="Tu nombre"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && joinAsOther()}
                    className="h-12"
                    style={{ borderRadius: 12, borderColor: LINE, fontSize: 16 }}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOther(false)}
                    disabled={loading}
                    className="flex-1 disabled:opacity-60"
                    style={{
                      height: 48, borderRadius: 12,
                      background: "#fff", border: `1px solid ${LINE}`,
                      color: MUTED, fontSize: 14, fontWeight: 500, letterSpacing: -0.05,
                    }}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={joinAsOther}
                    disabled={loading}
                    className="flex-1 disabled:opacity-60"
                    style={{
                      height: 48, borderRadius: 12, background: INK, color: "#fff",
                      fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
                      boxShadow: "0 8px 20px -8px rgba(55,48,163,0.5)",
                    }}
                  >
                    {loading ? "Entrando…" : "Entrar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
