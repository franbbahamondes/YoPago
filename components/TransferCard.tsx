"use client"

import { useState } from "react"
import type { TransferData } from "@/types/database"
import { toast } from "sonner"
import posthog from "posthog-js"
import { formatCLP } from "@/lib/format"
import { INK, INK_SOFT, INK_DEEP, TEXT, MUTED, LINE } from "@/lib/design-tokens"
import { SURFACE, WHATSAPP, WHATSAPP_BG, WHATSAPP_BORDER } from "@/lib/semantic-tokens"

interface Props {
  datos: TransferData
  billNombre?: string
  amount?: number
  shareUrl?: string
  onEdit?: () => void
}

export default function TransferCard({ datos, billNombre, amount, shareUrl, onEdit }: Props) {
  type Field = { label: string; value: string; copy: boolean }
  // Los 5 requeridos están garantizados por el parent. Email y alias pueden ser null/vacío.
  const optional: Array<[string, string | null | undefined, boolean]> = [
    ["Email", datos.email, true],
    ["Alias", datos.alias, true],
  ]
  const fields: Field[] = [
    { label: "Nombre",       value: datos.nombre,      copy: false },
    { label: "RUT",          value: datos.rut,         copy: true  },
    { label: "Banco",        value: datos.banco,       copy: false },
    { label: "Tipo",         value: datos.tipo_cuenta, copy: false },
    { label: "N° de cuenta", value: datos.numero,      copy: true  },
    ...optional
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
      .map(([label, value, copy]) => ({ label, value: (value as string).trim(), copy })),
  ]

  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      toast.success(`${label} copiado`)
      setTimeout(() => setCopied(null), 1400)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  const copyAll = async () => {
    const text = fields.map(f => `${f.label}: ${f.value}`).join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Datos copiados")
      posthog.capture("transfer_data_copied", { bill_name: billNombre })
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  const copyAmount = async () => {
    if (amount == null) return
    try {
      await navigator.clipboard.writeText(String(Math.round(amount)))
      toast.success("Monto copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  const whatsappMsg = shareUrl
    ? encodeURIComponent(`Entra a la cuenta "${billNombre ?? ""}": ${shareUrl}`)
    : null

  const host = datos.nombre || "el organizador"
  const showAmount = typeof amount === "number" && amount > 0

  return (
    <section
      aria-label={`Transferir a ${host}`}
      className="rounded-3xl"
      style={{
        background: "#fff",
        border: `1px solid ${LINE}`,
        padding: 18,
      }}
    >
      {/* Heading */}
      <div className="flex items-start justify-between gap-3">
        <h2
          style={{
            fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
            fontSize: 26, fontWeight: 700, letterSpacing: -0.6,
            lineHeight: 1.05, color: TEXT, margin: 0,
          }}
        >
          Transfiérele<br/>a {host.split(" ")[0]}
        </h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-full"
            style={{
              padding: "6px 12px",
              background: INK_SOFT,
              color: INK,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: -0.05,
              border: "none",
            }}
          >
            Editar
          </button>
        )}
      </div>
      <p
        className="mt-2 text-sm"
        style={{ color: MUTED, letterSpacing: -0.05, lineHeight: 1.5 }}
      >
        Copia cada dato tocándolo. Luego márcalo como pagado.
      </p>

      {/* Amount hero — only shown when we know the invitee's share */}
      {showAmount && (
        <button
          type="button"
          onClick={copyAmount}
          className="mt-4 flex w-full items-center justify-between text-left"
          style={{
            background: INK,
            color: "#fff",
            borderRadius: 18,
            padding: "14px 18px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: 1.4,
              }}
            >Monto a transferir</div>
            <div
              style={{
                marginTop: 4,
                fontFamily: "'Instrument Serif', ui-serif, Georgia, serif",
                fontSize: 30, fontWeight: 700, letterSpacing: -0.7,
                fontVariantNumeric: "tabular-nums",
              }}
            >{formatCLP(amount as number)}</div>
          </div>
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              padding: "7px 11px", borderRadius: 999,
              background: "rgba(255,255,255,0.15)",
              fontSize: 12, fontWeight: 600, letterSpacing: -0.05,
            }}
          >
            <CopyGlyph color="#fff" />
            Copiar
          </span>
        </button>
      )}

      {/* Transfer rows */}
      <div
        className="mt-4 overflow-hidden"
        style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16 }}
      >
        {fields.map((f, i) => (
          <div
            key={f.label}
            className="flex items-center gap-2 px-4 py-3"
            style={{
              borderBottom: i < fields.length - 1 ? `1px solid ${LINE}` : "none",
            }}
          >
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: 11, fontWeight: 600, color: MUTED,
                  textTransform: "uppercase", letterSpacing: 1.2,
                }}
              >{f.label}</div>
              <div
                className="mt-0.5 truncate"
                style={{
                  fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.2,
                  fontVariantNumeric: "tabular-nums",
                }}
              >{f.value}</div>
            </div>
            {f.copy && (
              <button
                type="button"
                onClick={() => copy(f.label, f.value)}
                aria-label={`Copiar ${f.label}`}
                className="shrink-0"
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: copied === f.label ? INK_SOFT : SURFACE,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {copied === f.label ? (
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M3 7l3 3 5-6" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <CopyGlyph color={TEXT} />
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Hint */}
      <div
        className="mt-4 flex items-start gap-3"
        style={{
          padding: "12px 14px", borderRadius: 12,
          background: INK_SOFT, border: `1px solid ${INK}22`,
        }}
      >
        <div
          className="shrink-0"
          style={{
            width: 18, height: 18, borderRadius: 999, background: INK, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
          }}
        >i</div>
        <div
          style={{ fontSize: 12, color: INK_DEEP, lineHeight: 1.5, letterSpacing: -0.05 }}
        >
          Abre tu app del banco y pega los datos. Vuelve aquí cuando hayas pagado.
        </div>
      </div>

      {/* Secondary actions */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={copyAll}
          className="flex-1 inline-flex items-center justify-center gap-2"
          style={{
            height: 44, borderRadius: 12,
            background: "#fff", border: `1px solid ${LINE}`,
            color: TEXT, fontSize: 14, fontWeight: 500, letterSpacing: -0.05,
          }}
        >
          <CopyGlyph color={TEXT} /> Copiar todo
        </button>
        {whatsappMsg && (
          <a
            href={`https://wa.me/?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => posthog.capture("bill_shared_via_whatsapp", { bill_name: billNombre })}
            className="flex-1 inline-flex items-center justify-center gap-2"
            style={{
              height: 44, borderRadius: 12,
              background: WHATSAPP_BG,
              border: `1px solid ${WHATSAPP_BORDER}`,
              color: WHATSAPP,
              fontSize: 14, fontWeight: 600, letterSpacing: -0.05,
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Compartir link
          </a>
        )}
      </div>
    </section>
  )
}

function CopyGlyph({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.4"/>
      <path d="M2 10V3a1 1 0 011-1h7" stroke={color} strokeWidth="1.4"/>
    </svg>
  )
}
