"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import JoinDialog from "@/components/JoinDialog"
import ItemRow from "@/components/ItemRow"
import AddItemForm from "@/components/AddItemForm"
import SummarySection from "@/components/SummarySection"
import TransferCard from "@/components/TransferCard"
import ReceiptUpload from "@/components/ReceiptUpload"
import TipDiscountPanel from "@/components/TipDiscountPanel"
import { createClient } from "@/lib/supabase/client"
import { getBillIdentity, isOwnedBill } from "@/lib/local-storage"
import type { Bill, Item, Participant, ItemAssignment, DatosTransferencia } from "@/types/database"
import { toast } from "sonner"
import { ArrowLeft, Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Props {
  bill: Bill
  initialItems: Item[]
  initialParticipants: Participant[]
  initialAssignments: ItemAssignment[]
}

export default function BillClient({ bill, initialItems, initialParticipants, initialAssignments }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [assignments, setAssignments] = useState<ItemAssignment[]>(initialAssignments)
  const [billData, setBillData] = useState<Bill>(bill)

  const [myParticipantId, setMyParticipantId] = useState<string | null>(null)
  const [showJoin, setShowJoin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

  const shareUrl = typeof window !== "undefined" ? window.location.href : ""

  // On mount: check localStorage for existing identity
  useEffect(() => {
    const identity = getBillIdentity(bill.slug)
    if (identity) {
      setMyParticipantId(identity.participantId)
    } else {
      setShowJoin(true)
    }
    setIsOwner(isOwnedBill(bill.slug))
  }, [bill.slug])

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`bill-${bill.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `bill_id=eq.${bill.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") setParticipants(p => [...p, payload.new as Participant])
          if (payload.eventType === "DELETE") setParticipants(p => p.filter(x => x.id !== (payload.old as Participant).id))
          if (payload.eventType === "UPDATE") setParticipants(p => p.map(x => x.id === (payload.new as Participant).id ? payload.new as Participant : x))
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "items", filter: `bill_id=eq.${bill.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") setItems(p => [...p, payload.new as Item])
          if (payload.eventType === "DELETE") setItems(p => p.filter(x => x.id !== (payload.old as Item).id))
          if (payload.eventType === "UPDATE") setItems(p => p.map(x => x.id === (payload.new as Item).id ? payload.new as Item : x))
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "item_assignments" },
        (payload) => {
          if (payload.eventType === "INSERT") setAssignments(p => [...p, payload.new as ItemAssignment])
          if (payload.eventType === "DELETE") {
            const d = payload.old as ItemAssignment
            setAssignments(p => p.filter(x => !(x.item_id === d.item_id && x.participant_id === d.participant_id)))
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bills", filter: `id=eq.${bill.id}` },
        (payload) => setBillData(payload.new as Bill)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [bill.id])

  const handleJoined = (participantId: string, name: string) => {
    setMyParticipantId(participantId)
    setShowJoin(false)
  }

  const handleAssignToggle = useCallback(async (itemId: string, participantId: string, currentlyAssigned: boolean) => {
    // Optimistic update — UI reacts instantly
    if (currentlyAssigned) {
      setAssignments(p => p.filter(x => !(x.item_id === itemId && x.participant_id === participantId)))
    } else {
      setAssignments(p => [...p, { item_id: itemId, participant_id: participantId }])
    }

    const supabase = createClient()
    if (currentlyAssigned) {
      const { error } = await supabase.from("item_assignments").delete().eq("item_id", itemId).eq("participant_id", participantId)
      if (error) {
        // Revert
        setAssignments(p => [...p, { item_id: itemId, participant_id: participantId }])
        toast.error("No se pudo quitar la asignación")
      }
    } else {
      const { error } = await supabase.from("item_assignments").insert({ item_id: itemId, participant_id: participantId })
      if (error && error.code !== "23505") {
        // Revert
        setAssignments(p => p.filter(x => !(x.item_id === itemId && x.participant_id === participantId)))
        toast.error("No se pudo asignar")
      }
    }
  }, [])

  const handleItemAdded = (item: Item) => setItems(p => [...p, item])
  const handleItemDeleted = (id: string) => {
    setItems(p => p.filter(x => x.id !== id))
    setAssignments(p => p.filter(x => x.item_id !== id))
  }
  const handleItemUpdated = (item: Item) => setItems(p => p.map(x => x.id === item.id ? item : x))

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link copiado")
  }

  const datos = billData.datos_transferencia as unknown as DatosTransferencia | null

  return (
    <div className="min-h-screen bg-background pb-32">
      {showJoin && <JoinDialog bill={billData} onJoined={handleJoined} />}

      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
          <a href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="flex-1 min-w-0">
            <h1 className="truncate font-bold">{billData.nombre}</h1>
            {billData.creador_nombre && (
              <p className="text-xs text-muted-foreground">Por {billData.creador_nombre}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={copyLink} title="Copiar link">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-4 px-5 pt-4">
        {/* Participantes activos */}
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {participants.map(p => (
              <Badge key={p.id} variant="secondary" className="gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: `oklch(0.7 0.15 ${(p.id.charCodeAt(0) * 137) % 360})` }}
                />
                {p.nombre}
              </Badge>
            ))}
          </div>
        )}

        {/* Upload boleta (solo owner) */}
        {isOwner && (
          <ReceiptUpload
            bill={billData}
            onItemsExtracted={(newItems) => setItems(p => [...p, ...newItems])}
            onBillUpdated={(updated) => setBillData(updated)}
          />
        )}

        {/* Lista de ítems */}
        <div>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ítems</h2>
            {participants.length > 0 && myParticipantId && (
              <p className="text-xs text-muted-foreground">Toca tu avatar en cada plato que pediste</p>
            )}
          </div>
          <div className="space-y-2">
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                participants={participants}
                assignments={assignments}
                isOwner={isOwner}
                myParticipantId={myParticipantId}
                onDeleted={handleItemDeleted}
                onUpdated={handleItemUpdated}
                onAssignToggle={handleAssignToggle}
              />
            ))}
            {isOwner && (
              <AddItemForm
                billId={bill.id}
                nextOrden={items.length}
                onAdded={handleItemAdded}
              />
            )}
            {items.length === 0 && !isOwner && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                El organizador está agregando los ítems…
              </p>
            )}
          </div>
        </div>

        {/* Propina y descuento (solo owner) */}
        {isOwner && (
          <TipDiscountPanel bill={billData} onUpdated={setBillData} />
        )}

        {/* Resumen */}
        <SummarySection
          bill={billData}
          items={items}
          participants={participants}
          assignments={assignments}
          myParticipantId={myParticipantId}
        />

        {/* Datos de transferencia */}
        {datos && (datos.banco || datos.numero || datos.alias) && (
          <TransferCard
            datos={datos}
            billNombre={billData.nombre}
            shareUrl={shareUrl}
          />
        )}
      </div>
    </div>
  )
}
