"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { Bill, Item } from "@/types/database"
import { toast } from "sonner"
import { Camera, Loader2, X, Check } from "lucide-react"
import posthog from "posthog-js"

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

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      let blob: Blob = file
      // Convert HEIC on iOS
      if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        const heic2any = (await import("heic2any")).default
        blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 })) as Blob
      }

      const supabase = createClient()
      const path = `${bill.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, blob, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from("receipts").getPublicUrl(path)

      const { data: updatedBill, error: billErr } = await supabase
        .from("bills").update({ imagen_url: publicUrl }).eq("id", bill.id).select().single()
      if (billErr) throw billErr
      onBillUpdated(updatedBill)
      setPreview(publicUrl)

      // Extract items with Claude
      setExtracting(true)
      const distinctId = posthog.get_distinct_id()
      const res = await fetch("/api/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(distinctId ? { "x-posthog-distinct-id": distinctId } : {}),
        },
        body: JSON.stringify({ imageUrl: publicUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Error al procesar la imagen")
      posthog.capture("receipt_uploaded", {
        bill_id: bill.id,
        items_detected: json.items?.length ?? 0,
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

  if (bill.imagen_url && !extracted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-2 text-sm text-muted-foreground">
        <Camera className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Boleta subida</span>
        <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
          Cambiar
        </Button>
        <input ref={inputRef} type="file" accept="image/*,.heic" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    )
  }

  if (extracted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">
            {extracted.length} ítems detectados en la boleta:
          </p>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {extracted.map((it, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-green-900 flex-1 truncate">{it.name}</span>
                <span className="text-green-700 ml-2 shrink-0">
                  {it.quantity > 1 ? `${it.quantity}× ` : ""}${it.price.toLocaleString("es-CL")}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleConfirmItems} disabled={saving}>
              <Check className="h-4 w-4" /> {saving ? "Guardando…" : "Confirmar ítems"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExtracted(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <button
      onClick={() => inputRef.current?.click()}
      disabled={uploading || extracting}
      className="flex w-full items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-50"
    >
      {uploading || extracting ? (
        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
      ) : (
        <Camera className="h-5 w-5 shrink-0" />
      )}
      <span>
        {uploading ? "Subiendo imagen…" : extracting ? "Procesando boleta con IA…" : "Subir foto de la boleta (opcional)"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </button>
  )
}
