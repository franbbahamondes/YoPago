"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import posthog from "posthog-js"
import JoinDialog from "@/components/JoinDialog"
import ItemRow from "@/components/ItemRow"
import ItemEditSheet from "@/components/ItemEditSheet"
import AddItemForm from "@/components/AddItemForm"
import SummarySection from "@/components/SummarySection"
import TransferCard from "@/components/TransferCard"
import TransferEditSheet from "@/components/TransferEditSheet"
import ReceiptUpload from "@/components/ReceiptUpload"
import TipDiscountPanel from "@/components/TipDiscountPanel"
import { createClient } from "@/lib/supabase/client"
import { getBillIdentity, isOwnedBill } from "@/lib/local-storage"
import { computeTotals } from "@/lib/totals"
import { transferStatus, toTransferData } from "@/lib/transfer-data"
import { formatCLP } from "@/lib/format"
import { INK, TEXT, MUTED, LINE, BG } from "@/lib/design-tokens"
import type { Bill, Item, Participant, ItemAssignment, TransferDataRow } from "@/types/database"
import { toast } from "sonner"

interface Props {
  bill: Bill
  initialItems: Item[]
  initialParticipants: Participant[]
  initialAssignments: ItemAssignment[]
  initialTransferData: TransferDataRow | null
}

export default function BillClient({ bill, initialItems, initialParticipants, initialAssignments, initialTransferData }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [assignments, setAssignments] = useState<ItemAssignment[]>(initialAssignments)
  const [billData, setBillData] = useState<Bill>(bill)
  const [transferData, setTransferData] = useState<TransferDataRow | null>(initialTransferData)

  const [myParticipantId, setMyParticipantId] = useState<string | null>(null)
  const [showJoin, setShowJoin] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [editTransferOpen, setEditTransferOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)

  const shareUrl = typeof window !== "undefined" ? window.location.href : ""

  // On mount: check localStorage for existing identity
  useEffect(() => {
    const identity = getBillIdentity(bill.slug)
    if (identity) {
      setMyParticipantId(identity.participantId)
    } else {
      setShowJoin(true)
    }
    const owned = isOwnedBill(bill.slug)
    setIsOwner(owned)

    posthog.capture("bill_detail_viewed", {
      bill_slug: bill.slug,
      role: owned ? "owner" : "invitee",
      has_transfer_data: transferStatus(initialTransferData) === "complete",
      item_count: initialItems.length,
    })
  }, [bill.slug, initialTransferData, initialItems.length])

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
      .on("postgres_changes", { event: "*", schema: "public", table: "transfer_data", filter: `bill_id=eq.${bill.id}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setTransferData(payload.new as TransferDataRow)
          } else if (payload.eventType === "DELETE") {
            setTransferData(null)
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [bill.id])

  const handleJoined = (participantId: string) => {
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
        setAssignments(p => [...p, { item_id: itemId, participant_id: participantId }])
        toast.error("No se pudo quitar la asignación")
      } else {
        posthog.capture("item_unassigned", { bill_slug: bill.slug, item_id: itemId, participant_id: participantId })
      }
    } else {
      const { error } = await supabase.from("item_assignments").insert({ item_id: itemId, participant_id: participantId })
      if (error && error.code !== "23505") {
        setAssignments(p => p.filter(x => !(x.item_id === itemId && x.participant_id === participantId)))
        toast.error("No se pudo asignar")
      } else if (!error) {
        posthog.capture("item_assigned", { bill_slug: bill.slug, item_id: itemId, participant_id: participantId })
      }
    }
  }, [bill.slug])

  const handleItemAdded = (item: Item) => setItems(p => [...p, item])
  const handleItemDeleted = (id: string) => {
    setItems(p => p.filter(x => x.id !== id))
    setAssignments(p => p.filter(x => x.item_id !== id))
  }
  const handleItemUpdated = (item: Item) => setItems(p => p.map(x => x.id === item.id ? item : x))

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copiado")
      posthog.capture("bill_link_copied", { bill_slug: bill.slug })
    } catch { toast.error("No se pudo copiar") }
  }

  const shareLink = async () => {
    const shareData = {
      title: billData.nombre,
      text: `Entra a la cuenta "${billData.nombre}"`,
      url: shareUrl,
    }
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData)
        posthog.capture("bill_link_shared", { bill_slug: bill.slug, method: "web_share" })
        return
      } catch (err) {
        // User canceled share sheet — not an error
        if (err instanceof Error && err.name === "AbortError") return
      }
    }
    // Fallback: copy to clipboard
    copyLink()
  }

  const tStatus = transferStatus(transferData)
  const hasCompleteTransfer = tStatus === "complete"
  const datos = toTransferData(transferData)

  const totals = useMemo(() => computeTotals({
    items,
    participants,
    assignments,
    tipPercent: Number(billData.tip_percent),
    globalDiscountAmount: Number(billData.global_discount_amount),
    globalDiscountPercent: Number(billData.global_discount_percent),
  }), [items, participants, assignments, billData.tip_percent, billData.global_discount_amount, billData.global_discount_percent])

  const myTotal = useMemo(() => {
    if (!myParticipantId) return 0
    return totals.perPerson.find(x => x.participant.id === myParticipantId)?.total ?? 0
  }, [totals, myParticipantId])

  const assignedItemsCount = useMemo(
    () => items.filter(it => assignments.some(a => a.item_id === it.id)).length,
    [items, assignments]
  )
  const progressPct = items.length > 0 ? Math.round(assignedItemsCount / items.length * 100) : 0

  // Header greeting bits
  const hostFirstName = (billData.creador_nombre || "").split(" ")[0]
  const myInitial = (myParticipantId
    ? participants.find(p => p.id === myParticipantId)?.nombre
    : undefined) || (isOwner ? hostFirstName : "")

  return (
    <div className="min-h-screen" style={{ background: BG, paddingBottom: hasCompleteTransfer || items.length > 0 ? 148 : 24 }}>
      {showJoin && <JoinDialog bill={billData} participants={participants} onJoined={handleJoined} />}

      {/* Header — iOS-style wordmark + avatar */}
      <header
        className="sticky top-0 z-10"
        style={{
          background: `${BG}F2`,
          backdropFilter: "saturate(180%) blur(14px)",
          WebkitBackdropFilter: "saturate(180%) blur(14px)",
          borderBottom: `1px solid ${LINE}`,
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <a
            href="/"
            className="inline-flex items-baseline"
            style={{
              fontFamily: "Geist, -apple-system, sans-serif",
              fontSize: 18, fontWeight: 800, color: INK, letterSpacing: "-0.06em",
            }}
          >
            yo<span style={{ fontWeight: 900, transform: "skewX(-4deg)", display: "inline-block", margin: "0 -0.04em" }}>/</span>pago
          </a>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditTransferOpen(true)}
                aria-label="Editar datos de transferencia"
                style={{
                  position: "relative",
                  width: 36, height: 36, borderRadius: 999,
                  background: "#fff", border: `1px solid ${LINE}`,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10.5 2.5l3 3L5 14H2v-3l8.5-8.5z"
                    stroke={TEXT}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                {!hasCompleteTransfer && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 6, right: 6,
                      width: 7, height: 7, borderRadius: 999,
                      background: INK,
                      border: "1.5px solid #fff",
                    }}
                  />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={shareLink}
              aria-label="Compartir link"
              style={{
                width: 36, height: 36, borderRadius: 999,
                background: "#fff", border: `1px solid ${LINE}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1.5" stroke={TEXT} strokeWidth="1.4"/>
                <path d="M2 10V3a1 1 0 011-1h7" stroke={TEXT} strokeWidth="1.4"/>
              </svg>
            </button>
            {myInitial && (
              <div
                aria-hidden
                style={{
                  width: 32, height: 32, borderRadius: 999, background: TEXT,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >{myInitial.trim().charAt(0).toUpperCase()}</div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-5">
        {/* Event label block */}
        <div className="mb-4">
          <div
            style={{
              fontSize: 11, fontWeight: 600, color: MUTED,
              textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 6,
            }}
          >
            {isOwner
              ? `${participants.length} ${participants.length === 1 ? "invitado" : "invitados"}`
              : hostFirstName
                ? `Invitado por ${hostFirstName}`
                : "Cuenta compartida"}
          </div>
          <h1
            style={{
              fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
              fontSize: 30, fontWeight: 700, letterSpacing: -0.7,
              lineHeight: 1.05, color: TEXT, margin: 0,
            }}
          >
            {billData.nombre}
          </h1>
          {!isOwner && items.length > 0 && (
            <p className="mt-2" style={{ fontSize: 13, color: MUTED, letterSpacing: -0.05, lineHeight: 1.5 }}>
              Marca o desmarca los ítems que pediste. Se divide en partes iguales.
            </p>
          )}
        </div>

        {/* Upload boleta (solo owner) */}
        {isOwner && (
          <div className="mb-4">
            <ReceiptUpload
              bill={billData}
              onItemsExtracted={(newItems) => setItems(p => [...p, ...newItems])}
              onBillUpdated={(updated) => setBillData(updated)}
            />
          </div>
        )}

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mb-3">
            <div className="flex justify-between mb-1.5" style={{ fontSize: 12 }}>
              <span style={{ color: MUTED, letterSpacing: -0.05 }}>
                {assignedItemsCount} de {items.length} asignados
              </span>
              <span style={{ color: TEXT, fontWeight: 600 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 4, background: LINE, borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", background: INK, borderRadius: 2,
                  width: `${progressPct}%`, transition: "width 300ms ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex flex-col gap-2.5">
          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              participants={participants}
              assignments={assignments}
              isOwner={isOwner}
              myParticipantId={myParticipantId}
              onEdit={setEditingItem}
              onAssignToggle={handleAssignToggle}
            />
          ))}
          <AddItemForm
            billId={bill.id}
            nextOrden={items.length}
            isOwner={isOwner}
            onAdded={handleItemAdded}
          />
          {items.length === 0 && !isOwner && (
            <p
              className="py-8 text-center"
              style={{ fontSize: 14, color: MUTED, letterSpacing: -0.05 }}
            >
              El organizador está agregando los ítems…
            </p>
          )}
        </div>

        {/* Propina (owner) + descuento global (todos) */}
        {items.length > 0 && (
          <div className="mt-4">
            <TipDiscountPanel bill={billData} isOwner={isOwner} onUpdated={setBillData} />
          </div>
        )}

        {/* Resumen (solo owner) */}
        {isOwner && (
          <div className="mt-4">
            <SummarySection
              bill={billData}
              items={items}
              participants={participants}
              assignments={assignments}
              myParticipantId={myParticipantId}
            />
          </div>
        )}

        {/* Transfer card inline — solo invitee cuando el bill tiene datos completos */}
        {!isOwner && hasCompleteTransfer && datos && items.length > 0 && (
          <div className="mt-4">
            <TransferCard
              datos={datos}
              billNombre={billData.nombre}
              amount={myTotal}
              shareUrl={shareUrl}
            />
          </div>
        )}
      </main>

      <TransferEditSheet
        open={editTransferOpen}
        onClose={() => setEditTransferOpen(false)}
        billId={bill.id}
        billSlug={bill.slug}
        initial={transferData}
      />

      <ItemEditSheet
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onUpdated={handleItemUpdated}
        onDeleted={handleItemDeleted}
      />

      {/* Sticky bottom summary + CTA */}
      {items.length > 0 && (
        <div
          className="fixed left-0 right-0 bottom-0"
          style={{
            background: "#fff",
            borderTop: `1px solid ${LINE}`,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            paddingBottom: "max(20px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto max-w-md px-5 pt-3.5 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>Total</div>
                <div
                  style={{
                    fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
                    fontSize: 24, fontWeight: 700, color: TEXT, letterSpacing: -0.5,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >{formatCLP(totals.total)}</div>
              </div>
              {myParticipantId && (
                <div className="text-right">
                  <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                    {isOwner ? "Tú" : "Tu parte"}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
                      fontSize: 24, fontWeight: 700, color: INK, letterSpacing: -0.5,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >{formatCLP(myTotal)}</div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={shareLink}
              className="w-full inline-flex items-center justify-center gap-2"
              style={{
                height: 52, borderRadius: 14, background: INK, color: "#fff",
                fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
                boxShadow: "0 8px 20px -8px rgba(55,48,163,0.5)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11 5l-3-3-3 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2v9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M3 9v3a1 1 0 001 1h8a1 1 0 001-1V9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Compartir link
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
