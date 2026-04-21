"use client"

import { useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Bill, Item } from "@/types/database"
import { toast } from "sonner"
import posthog from "posthog-js"
import { formatCLP } from "@/lib/format"
import { INK, INK_SOFT, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import { SUCCESS, SUCCESS_BG, SUCCESS_BORDER } from "@/lib/semantic-tokens"
import ExtractedItemEditSheet, { type ExtractedDraft } from "@/components/ExtractedItemEditSheet"

interface ExtractedItem {
  name: string
  price: number
  quantity: number
  discount_amount?: number
}

interface Props {
  bill: Bill
  onItemsExtracted: (items: Item[]) => void
  onBillUpdated: (bill: Bill) => void
}

export default function ReceiptUpload({ bill, onItemsExtracted, onBillUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [preview, setPreview] = useState<string | null>(bill.imagen_url)
  const [extracted, setExtracted] = useState<ExtractedItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const busy = uploading || extracting

  const handleFile = async (file: File) => {
    const startedAt = Date.now()
    setUploading(true)
    try {
      let blob: Blob = file
      // Convert HEIC on iOS
      if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default
        blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })) as Blob
      }

      // Resize to max 1280px at 0.8 quality via canvas.toDataURL (synchronous, iOS-safe)
      // Keeps base64 well under Vercel's 4.5MB body limit
      const base64Image = await new Promise<string>((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(blob)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const MAX = 1280
          const scale = Math.min(1, MAX / Math.max(img.width, img.height))
          const canvas = document.createElement("canvas")
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
          // toDataURL is synchronous and universally supported (incl. iOS Safari)
          resolve(canvas.toDataURL("image/jpeg", 0.8).split(",")[1])
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          // Fallback: send original blob as base64 via FileReader
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(",")[1])
          reader.onerror = () => resolve("")
          reader.readAsDataURL(blob)
        }
        img.src = url
      })

      // Upload original blob to Supabase Storage in parallel (best-effort, non-blocking)
      void (async () => {
        try {
          const supabase = createClient()
          const path = `${bill.id}/${Date.now()}.jpg`
          const { error: upErr } = await supabase.storage.from("receipts").upload(path, blob, { upsert: true })
          if (upErr) return
          const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(path)
          setPreview(publicUrl)
          const { data: updatedBill, error: billErr } = await supabase
            .from("bills").update({ imagen_url: publicUrl }).eq("id", bill.id).select().single()
          if (!billErr && updatedBill) onBillUpdated(updatedBill)
        } catch { /* storage errors are non-critical */ }
      })()

      // Start OCR immediately with compressed base64
      setUploading(false)
      setExtracting(true)
      const distinctId = posthog.get_distinct_id()
      const res = await fetch("/api/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(distinctId ? { "x-posthog-distinct-id": distinctId } : {}),
        },
        body: JSON.stringify({ base64Image, billId: bill.id }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Error ${res.status} al procesar la imagen`)
      }
      const json = await res.json()
      posthog.capture("receipt_uploaded", {
        bill_id: bill.id,
        items_detected: json.items?.length ?? 0,
      })
      posthog.capture("ocr_waiting_viewed", {
        bill_id: bill.id,
        duration_ms: Date.now() - startedAt,
      })
      setExtracted(json.items)
    } catch (e) {
      posthog.captureException(e)
      toast.error(e instanceof Error ? e.message : "Error al subir la imagen")
    } finally {
      setUploading(false)
      setExtracting(false)
    }
  }

  const handleConfirmItems = async () => {
    if (!extracted) return
    setSaving(true)
    try {
      const supabase = createClient()
      const toInsert = extracted.map((it, i) => ({
        bill_id: bill.id,
        descripcion: it.name,
        precio: Math.round(it.price),
        cantidad: it.quantity || 1,
        descuento_monto: Math.round(it.discount_amount || 0),
        orden: i,
      }))
      const { data, error } = await supabase.from("items").insert(toInsert).select()
      if (error) throw error
      posthog.capture("receipt_items_confirmed", {
        bill_id: bill.id,
        items_confirmed: data.length,
      })
      onItemsExtracted(data)
      setExtracted(null)
      toast.success(`${data.length} ítems agregados`)
    } catch (e) { posthog.captureException(e); toast.error("No se pudieron guardar los ítems") }
    finally { setSaving(false) }
  }

  // ── Compact state: boleta already uploaded, no pending review ───────────
  if (bill.imagen_url && !extracted) {
    return (
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm"
        style={{ background: "#fff", border: `1px solid ${LINE}`, color: MUTED }}
      >
        <CameraIcon />
        <span className="flex-1 truncate" style={{ color: TEXT }}>Boleta subida</span>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: INK_SOFT, color: INK }}
        >
          Cambiar
        </button>
        <input ref={inputRef} type="file" accept="image/*,.heic" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    )
  }

  // ── Review state: items extracted, user confirms ────────────────────────
  if (extracted) {
    const subtotal = extracted.reduce(
      (s, it) => s + Math.max(0, it.quantity * it.price - (it.discount_amount ?? 0)),
      0
    )
    const editingDraft: ExtractedDraft | null =
      editingIndex != null && extracted[editingIndex] ? extracted[editingIndex] : null

    const updateDraft = (i: number, next: ExtractedDraft) => {
      setExtracted(prev => prev?.map((x, j) => j === i ? next : x) ?? prev)
      posthog.capture("extracted_item_edited", { bill_id: bill.id, index: i })
    }
    const removeDraft = (i: number) => {
      setExtracted(prev => prev?.filter((_, j) => j !== i) ?? prev)
      posthog.capture("extracted_item_removed", { bill_id: bill.id, index: i })
    }

    return (
      <div className="space-y-3">
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            background: SUCCESS_BG,
            border: `1px solid ${SUCCESS_BORDER}`,
            color: SUCCESS,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke={SUCCESS} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Listo
        </div>
        <h3
          style={{
            fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
            fontSize: 26, fontWeight: 700, letterSpacing: -0.6,
            lineHeight: 1.05, color: TEXT,
          }}
        >
          Encontramos<br/>{extracted.length} {extracted.length === 1 ? "ítem" : "ítems"}
        </h3>
        <p className="text-sm" style={{ color: MUTED, letterSpacing: -0.05 }}>
          Toca cualquier ítem para corregir nombre, precio o cantidad antes de confirmar.
        </p>

        {extracted.length === 0 ? (
          <div
            className="px-4 py-8 text-center"
            style={{
              background: "#fff", borderRadius: 18, border: `1px dashed ${LINE}`,
              fontSize: 14, color: MUTED, letterSpacing: -0.05,
            }}
          >
            Eliminaste todos los ítems. Descarta para volver a subir la boleta.
          </div>
        ) : (
          <div
            className="overflow-hidden"
            style={{ background: "#fff", borderRadius: 18, border: `1px solid ${LINE}` }}
          >
            {extracted.map((it, i) => {
              const hasDiscount = (it.discount_amount ?? 0) > 0
              const gross = it.quantity * it.price
              const net = Math.max(0, gross - (it.discount_amount ?? 0))
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEditingIndex(i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: i < extracted.length - 1 ? `1px solid ${LINE}` : "none",
                    cursor: "pointer",
                  }}
                  aria-label={`Editar ${it.name}`}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate"
                      style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2 }}
                    >{it.name}</div>
                    <div className="mt-0.5" style={{ fontSize: 12, color: MUTED }}>
                      {it.quantity > 1 ? `${it.quantity} × ${formatCLP(it.price)}` : "1 unidad"}
                      {hasDiscount && (
                        <span className="ml-1" style={{ color: SUCCESS, fontWeight: 600 }}>
                          · -{formatCLP(it.discount_amount!)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="shrink-0 flex items-center gap-2"
                    style={{
                      fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {hasDiscount && (
                      <span className="line-through opacity-40" style={{ fontSize: 12, color: MUTED }}>
                        {formatCLP(gross)}
                      </span>
                    )}
                    <span>{formatCLP(net)}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: 0.4 }}>
                      <path d="M4 2l4 4-4 4" stroke={TEXT} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between px-2 pt-1">
          <span style={{ fontSize: 13, color: MUTED }}>Subtotal detectado</span>
          <span
            style={{
              fontSize: 17, fontWeight: 700, color: TEXT, letterSpacing: -0.3,
              fontVariantNumeric: "tabular-nums",
            }}
          >{formatCLP(subtotal)}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirmItems}
            disabled={saving || extracted.length === 0}
            className="flex-1 disabled:opacity-60"
            style={{
              height: 52, borderRadius: 14, background: INK, color: "#fff",
              fontSize: 15, fontWeight: 600, letterSpacing: -0.1,
              boxShadow: "0 8px 20px -8px rgba(55,48,163,0.5)",
            }}
          >
            {saving ? "Guardando…" : "Confirmar y asignar"}
          </button>
          <button
            onClick={() => setExtracted(null)}
            className="px-4"
            style={{
              height: 52, borderRadius: 14, background: "#fff",
              border: `1px solid ${LINE}`, color: MUTED,
              fontSize: 14, fontWeight: 500,
            }}
          >
            Descartar
          </button>
        </div>

        <ExtractedItemEditSheet
          open={editingIndex !== null}
          onClose={() => setEditingIndex(null)}
          draft={editingDraft}
          onSave={(next) => editingIndex != null && updateDraft(editingIndex, next)}
          onDelete={() => editingIndex != null && removeDraft(editingIndex)}
        />
      </div>
    )
  }

  // ── Default state: big dashed upload zone ──────────────────────────────
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full flex-col items-center justify-center gap-3.5 disabled:opacity-70"
        style={{
          height: 260,
          borderRadius: 20,
          border: `2px dashed ${INK}66`,
          background: "#fff",
        }}
      >
        <div
          style={{
            width: 60, height: 60, borderRadius: 18, background: INK_SOFT,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h3l2-2h6l2 2h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" stroke={INK} strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="3.5" stroke={INK} strokeWidth="1.8"/>
          </svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT, letterSpacing: -0.3 }}>
          {busy ? "Procesando…" : "Toca para subir la boleta"}
        </div>
        <div style={{ fontSize: 12, color: MUTED, letterSpacing: -0.05 }}>
          {busy ? "Espera un segundo" : "Foto o imagen de la galería"}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {/* Processing banner overlay — dark toast with spinner + progress */}
      {busy && (
        <div
          className="absolute left-2 right-2 bottom-2 flex items-center gap-3 px-4"
          style={{
            background: TEXT,
            color: "#fff",
            borderRadius: 16,
            padding: "12px 14px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: 20, height: 20,
              border: "2px solid rgba(255,255,255,0.25)",
              borderTopColor: "#fff", borderRadius: "50%",
              animation: "yp-spin 1s linear infinite", flexShrink: 0,
            }}
          />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.1 }}>
              {uploading ? "Subiendo imagen…" : "Procesando boleta…"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
              {uploading ? "Preparando" : "Leyendo ítems con IA"}
            </div>
            <div
              className="mt-2"
              style={{ height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}
            >
              <div
                style={{
                  height: "100%", background: INK_SOFT, borderRadius: 2,
                  width: extracting ? "70%" : "28%",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Skeleton rows while OCR is running — previews where items will land */}
      {busy && (
        <div className="mt-4 flex flex-col gap-2">
          {[0, 1, 2, 3].map(i => (
            <SkeletonItemRow key={i} delay={i * 120} />
          ))}
        </div>
      )}

      {/* Keyframes for spin + shimmer — global so inline-styled children can reference them */}
      <style jsx global>{`
        @keyframes yp-spin { to { transform: rotate(360deg); } }
        @keyframes yp-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

function SkeletonItemRow({ delay }: { delay: number }) {
  return (
    <div
      style={{
        height: 60,
        borderRadius: 16,
        border: `1px solid ${LINE}`,
        background:
          "linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%)",
        backgroundSize: "200% 100%",
        animation: `yp-shimmer 1.8s ease-in-out ${delay}ms infinite`,
      }}
    />
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M4 7h3l2-2h6l2 2h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" stroke={TEXT} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="3.5" stroke={TEXT} strokeWidth="1.6"/>
    </svg>
  )
}
