"use client"

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"
import { createClient } from "@/lib/supabase/client"
import { generateSlug } from "@/lib/slug"
import {
  getSavedBank,
  saveBank,
  addOwnedBill,
  getClientId,
  setBillIdentity,
} from "@/lib/local-storage"
import { transferStatus } from "@/lib/transfer-data"
import TransferFields, { EMPTY_TRANSFER, type TransferFieldsValue } from "@/components/TransferFields"
import { FieldLabel, UnderlineInput } from "@/components/form-primitives"
import { toast } from "sonner"

import { INK, INK_DEEP, INK_SOFT, TEXT, MUTED, LINE } from "@/lib/design-tokens"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

type Step = 0 | 1 | 2 | 3

export default function CreateBillForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)

  const [nombre, setNombre] = useState("")
  const [otrosParticipantes, setOtrosParticipantes] = useState<string[]>([])
  const [nuevoInvitado, setNuevoInvitado] = useState("")

  const [transfer, setTransfer] = useState<TransferFieldsValue>(EMPTY_TRANSFER)

  useEffect(() => {
    const saved = getSavedBank()
    if (saved) {
      setTransfer({
        nombre: saved.nombre,
        rut: saved.rut,
        banco: saved.banco,
        tipo_cuenta: saved.tipo_cuenta,
        numero: saved.numero,
        email: saved.email ?? "",
        alias: saved.alias ?? "",
      })
    }
  }, [])

  const next = () => setStep((s) => Math.min(3, s + 1) as Step)
  const back = () => setStep((s) => Math.max(0, s - 1) as Step)

  const agregarInvitado = () => {
    const v = nuevoInvitado.trim()
    if (!v) return
    setOtrosParticipantes((p) => [...p, v])
    setNuevoInvitado("")
  }
  const eliminarInvitado = (i: number) =>
    setOtrosParticipantes((p) => p.filter((_, idx) => idx !== i))

  const crearCuenta = async (overrideTransfer?: TransferFieldsValue) => {
    if (!nombre.trim()) {
      toast.error("Ponle un nombre al evento")
      setStep(1)
      return
    }
    const t = overrideTransfer ?? transfer
    const status = transferStatus(t)
    if (status === "partial") {
      toast.error("Completa todos los datos de transferencia o déjalos en blanco")
      return
    }

    const creadorName = t.nombre.trim() || "Yo"
    const otros = otrosParticipantes.map((p) => p.trim()).filter(Boolean)

    setSaving(true)
    try {
      const supabase = createClient()
      const slug = generateSlug()
      const clientId = getClientId()

      const { data: bill, error } = await supabase
        .from("bills")
        .insert({
          slug,
          nombre: nombre.trim(),
          creador_nombre: t.nombre.trim() || null,
        })
        .select()
        .single()
      if (error || !bill) throw error

      const { data: creadorParticipant, error: pErr } = await supabase
        .from("participants")
        .insert({ bill_id: bill.id, nombre: creadorName, client_id: clientId })
        .select()
        .single()
      if (pErr) throw pErr

      if (otros.length > 0) {
        const { error: otrosErr } = await supabase.from("participants").insert(
          otros.map((n) => ({ bill_id: bill.id, nombre: n, client_id: NIL_UUID })),
        )
        if (otrosErr) throw otrosErr
      }

      let transferSaveStatus: "success" | "failed" | "skipped" = "skipped"
      if (status === "complete") {
        saveBank({
          nombre: t.nombre.trim(),
          rut: t.rut.trim(),
          banco: t.banco.trim(),
          tipo_cuenta: t.tipo_cuenta.trim(),
          numero: t.numero.trim(),
          email: t.email.trim() || undefined,
          alias: t.alias.trim() || undefined,
        })
        const { error: tErr } = await supabase.from("transfer_data").insert({
          bill_id: bill.id,
          nombre: t.nombre.trim(),
          rut: t.rut.trim(),
          banco: t.banco.trim(),
          tipo_cuenta: t.tipo_cuenta.trim(),
          numero: t.numero.trim(),
          email: t.email.trim() || null,
          alias: t.alias.trim() || null,
        })
        if (tErr) {
          console.error("transfer_data insert failed:", tErr)
          posthog.capture("transfer_data_insert_failed", { bill_slug: slug, error: tErr.message })
          toast.warning("Creamos tu cuenta, pero no pudimos guardar los datos de transferencia. Podrás agregarlos desde el bill.")
          transferSaveStatus = "failed"
        } else {
          transferSaveStatus = "success"
        }
      }

      addOwnedBill(slug)
      setBillIdentity(slug, { participantId: creadorParticipant.id, name: creadorName })

      posthog.identify(clientId, {
        name: creadorName,
        ...(t.email.trim() ? { email: t.email.trim() } : {}),
      })
      posthog.capture("bill_created", {
        bill_slug: slug,
        event_name: nombre.trim(),
        participant_count: 1 + otros.length,
        transfer_save_status: transferSaveStatus,
        has_transfer_data: status === "complete",
        has_pre_registered_participants: otros.length > 0,
        marketing_opt_in: true,
      })

      router.push(`/b/${slug}`)
    } catch (e) {
      console.error(e)
      posthog.captureException(e)
      toast.error("No se pudo crear la cuenta")
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-8 pb-10 pt-10">
      {step === 0 && <Welcome onContinue={next} />}
      {step === 1 && (
        <EventName
          nombre={nombre}
          setNombre={setNombre}
          tuNombre={transfer.nombre}
          setTuNombre={(v) => setTransfer({ ...transfer, nombre: v })}
          onBack={back}
          onContinue={() => {
            if (!nombre.trim()) {
              toast.error("Ponle un nombre al evento")
              return
            }
            next()
          }}
        />
      )}
      {step === 2 && (
        <Invitees
          invitados={otrosParticipantes}
          nuevo={nuevoInvitado}
          setNuevo={setNuevoInvitado}
          agregar={agregarInvitado}
          eliminar={eliminarInvitado}
          onBack={back}
          onContinue={next}
        />
      )}
      {step === 3 && (
        <Transfer
          value={transfer}
          onChange={setTransfer}
          saving={saving}
          onBack={back}
          onSubmit={() => crearCuenta()}
          onSkip={() => {
            setTransfer(EMPTY_TRANSFER)
            crearCuenta(EMPTY_TRANSFER)
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Shared chrome
// ─────────────────────────────────────────────

function Logo({ size = 40 }: { size?: number }) {
  const fs = size * 1.35
  return (
    <div
      style={{
        fontFamily: "var(--font-geist), system-ui, sans-serif",
        fontWeight: 800,
        fontSize: fs,
        letterSpacing: "-0.06em",
        color: INK,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "baseline",
      }}
    >
      yo
      <span
        style={{
          display: "inline-block",
          transform: "skewX(-4deg)",
          margin: "0 -0.04em",
          fontWeight: 900,
        }}
      >
        /
      </span>
      pago
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
  inverted = false,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  inverted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl text-[17px] font-semibold transition active:scale-[0.98]"
      style={{
        height: 54,
        background: inverted ? "#fff" : disabled ? "#D1D5DB" : INK,
        color: inverted ? TEXT : "#fff",
        border: "none",
        letterSpacing: -0.2,
        cursor: disabled ? "default" : "pointer",
        boxShadow:
          disabled || inverted
            ? "none"
            : "0 1px 0 rgba(255,255,255,0.2) inset, 0 6px 14px rgba(55,48,163,0.22)",
      }}
    >
      {children}
    </button>
  )
}

function BackChevron({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Atrás"
      className="flex h-10 w-10 items-center justify-center rounded-full"
      style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
    >
      <svg width="11" height="18" viewBox="0 0 11 18" fill="none">
        <path
          d="M9 1L1.5 9 9 17"
          stroke={TEXT}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function StepDots({ count = 4, current = 0 }: { count?: number; current?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 22 : 6,
            height: 6,
            borderRadius: 3,
            background: i <= current ? INK : LINE,
            transition: "all 0.2s",
          }}
        />
      ))}
    </div>
  )
}

function NavRow({
  step,
  total = 4,
  onBack,
  onSkip,
}: {
  step: number
  total?: number
  onBack?: () => void
  onSkip?: () => void
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <BackChevron onClick={onBack} />
      <StepDots count={total} current={step} />
      {onSkip ? (
        <button
          onClick={onSkip}
          className="cursor-pointer border-none bg-transparent p-0 text-[15px] font-medium"
          style={{ color: MUTED, letterSpacing: -0.1 }}
        >
          Omitir
        </button>
      ) : (
        <div style={{ width: 40 }} />
      )}
    </div>
  )
}

function DisplayHeading({ children }: { children: ReactNode }) {
  return (
    <h1
      className="font-sans"
      style={{
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: -0.8,
        lineHeight: 1.05,
        color: TEXT,
        margin: 0,
      }}
    >
      {children}
    </h1>
  )
}

function Subtitle({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-3"
      style={{
        fontSize: 15,
        color: MUTED,
        letterSpacing: -0.1,
        lineHeight: 1.5,
        margin: 0,
        marginTop: 12,
      }}
    >
      {children}
    </p>
  )
}


// ─────────────────────────────────────────────
// Step 0 — Welcome (combined: bienvenida + cómo funciona)
// ─────────────────────────────────────────────

function Welcome({ onContinue }: { onContinue: () => void }) {
  const steps = [
    { n: "01", title: "Sube la boleta", body: "Foto y listo — leemos los ítems por ti.", preview: <ReceiptPreview /> },
    { n: "02", title: "Asigna cada ítem", body: "Toca quién pidió qué. Calculamos los totales.", preview: <AssignPreview /> },
    { n: "03", title: "Cobra sin perseguir", body: "Cada invitado ve cuánto debe y cómo pagarte.", preview: <TransferPreview /> },
  ]
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <Logo size={34} />
      <h1
        className="font-sans"
        style={{
          marginTop: 28,
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: -1.3,
          lineHeight: 0.98,
          color: TEXT,
          margin: 0,
          marginBlockStart: 28,
        }}
      >
        Divídelo<br />sin drama.
      </h1>
      <p
        style={{
          marginTop: 14,
          fontSize: 15,
          lineHeight: 1.45,
          color: MUTED,
          letterSpacing: -0.2,
          maxWidth: 320,
          margin: 0,
          marginBlockStart: 14,
        }}
      >
        Dividir una cuenta en segundos, sin registro ni descargas.
      </p>

      <div className="mt-7 flex flex-col gap-2.5">
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex items-center gap-3"
            style={{
              padding: 12,
              borderRadius: 16,
              background: "#fff",
              border: `1px solid ${LINE}`,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 12,
                background: INK_SOFT,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {s.preview}
            </div>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 10, fontWeight: 700, color: INK, letterSpacing: 1.4, marginBottom: 2 }}>
                {s.n}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, letterSpacing: -0.25 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4, letterSpacing: -0.05, marginTop: 2 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pt-8">
        <PrimaryButton onClick={onContinue}>Empezar</PrimaryButton>
        <div
          className="text-center"
          style={{
            fontSize: 13,
            color: MUTED,
            padding: "6px 0",
            letterSpacing: -0.05,
            lineHeight: 1.4,
          }}
        >
          Al continuar aceptas los{" "}
          <a
            href="/terminos"
            target="_blank"
            rel="noreferrer"
            style={{ color: TEXT, fontWeight: 600, textDecoration: "underline" }}
          >
            Términos
          </a>
        </div>
      </div>
    </div>
  )
}

function ReceiptPreview() {
  return (
    <div
      style={{
        width: 34,
        height: 46,
        background: "#fff",
        borderRadius: 3,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        padding: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {[22, 18, 24, 14, 20].map((w, i) => (
        <div key={i} style={{ height: 2, width: w, background: i === 4 ? INK : "#D1D5DB", borderRadius: 1 }} />
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ height: 3, width: "100%", background: TEXT, borderRadius: 1 }} />
    </div>
  )
}

function AssignPreview() {
  const rows: string[][] = [[INK, TEXT], [TEXT], [INK]]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {rows.map((avatars, i) => (
        <div key={i} style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <div style={{ width: 20, height: 3, background: "#D1D5DB", borderRadius: 1 }} />
          {avatars.map((c, j) => (
            <div
              key={j}
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: c,
                border: "1px solid #fff",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function TransferPreview() {
  return (
    <div
      style={{
        width: 42,
        height: 28,
        background: TEXT,
        borderRadius: 4,
        padding: 4,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ height: 2, width: 10, background: INK, borderRadius: 1 }} />
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{ width: 5, height: 2, background: "#fff", opacity: 0.7, borderRadius: 1 }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 2 — Event name
// ─────────────────────────────────────────────

function EventName({
  nombre,
  setNombre,
  tuNombre,
  setTuNombre,
  onBack,
  onContinue,
}: {
  nombre: string
  setNombre: (v: string) => void
  tuNombre: string
  setTuNombre: (v: string) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <NavRow step={1} total={4} onBack={onBack} />

      <DisplayHeading>
        ¿Cómo se llama<br />este evento?
      </DisplayHeading>
      <Subtitle>Dale un nombre y dinos cómo te llamas.</Subtitle>

      <div className="mt-8">
        <FieldLabel>Nombre del evento</FieldLabel>
        <UnderlineInput
          value={nombre}
          onChange={setNombre}
          placeholder="Cena del viernes"
          autoFocus
        />
      </div>

      <div className="mt-7">
        <FieldLabel>Tu nombre</FieldLabel>
        <UnderlineInput
          value={tuNombre}
          onChange={setTuNombre}
          placeholder="Juan"
        />
      </div>

      <div className="mt-auto pt-10">
        <PrimaryButton onClick={onContinue} disabled={!nombre.trim()}>
          Siguiente
        </PrimaryButton>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 3 — Invitees
// ─────────────────────────────────────────────

function Invitees({
  invitados,
  nuevo,
  setNuevo,
  agregar,
  eliminar,
  onBack,
  onContinue,
}: {
  invitados: string[]
  nuevo: string
  setNuevo: (v: string) => void
  agregar: () => void
  eliminar: (i: number) => void
  onBack: () => void
  onContinue: () => void
}) {
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      agregar()
    }
  }
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <NavRow step={2} total={4} onBack={onBack} />

      <DisplayHeading>
        ¿Quiénes<br />participan?
      </DisplayHeading>
      <Subtitle>Solo escribe nombres. Después cada invitado elige el suyo al abrir el link.</Subtitle>

      <div className="mt-7">
        <div
          className="flex items-center gap-2.5"
          style={{
            padding: "10px 12px 10px 16px",
            borderRadius: 16,
            background: "#fff",
            border: `1.5px solid ${INK}`,
            boxShadow: `0 0 0 4px ${INK}14`,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 999,
              background: INK_SOFT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: INK,
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            +
          </div>
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nombre del invitado"
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{
              fontSize: 16,
              color: TEXT,
              letterSpacing: -0.1,
              border: "none",
              padding: "4px 0",
            }}
          />
          <button
            onClick={agregar}
            disabled={!nuevo.trim()}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: nuevo.trim() ? TEXT : "#D1D5DB",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: -0.05,
              border: "none",
              cursor: nuevo.trim() ? "pointer" : "default",
              flexShrink: 0,
            }}
          >
            Agregar
          </button>
        </div>
      </div>

      {invitados.length > 0 && (
        <div className="mt-5">
          <FieldLabel>{invitados.length} agregados</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {invitados.map((n, i) => (
              <div
                key={`${n}-${i}`}
                className="inline-flex items-center gap-2"
                style={{
                  padding: "8px 10px 8px 14px",
                  borderRadius: 999,
                  background: "#fff",
                  border: `1px solid ${LINE}`,
                  fontSize: 15,
                  fontWeight: 500,
                  color: TEXT,
                  letterSpacing: -0.1,
                }}
              >
                {n}
                <button
                  onClick={() => eliminar(i)}
                  aria-label={`Quitar ${n}`}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "#F3F4F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10">
                    <path
                      d="M1 1l8 8M9 1l-8 8"
                      stroke={MUTED}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="mt-6"
        style={{
          padding: 16,
          background: INK_SOFT,
          borderRadius: 16,
          border: `1px solid ${INK}1F`,
        }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: INK,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ?
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: INK_DEEP,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            ¿Cómo se unen?
          </div>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: INK_DEEP, letterSpacing: -0.05 }}>
          Al abrir el link, cada persona elige su nombre de la lista — o se agrega sola si no lo
          incluiste.
        </div>
      </div>

      <div className="mt-auto pt-10">
        <PrimaryButton onClick={onContinue}>Siguiente</PrimaryButton>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 4 — Transfer (optional)
// ─────────────────────────────────────────────

function Transfer({
  value,
  onChange,
  saving,
  onBack,
  onSubmit,
  onSkip,
}: {
  value: TransferFieldsValue
  onChange: (next: TransferFieldsValue) => void
  saving: boolean
  onBack: () => void
  onSubmit: () => void
  onSkip: () => void
}) {
  const status = transferStatus(value)
  const isPartial = status === "partial"
  const canSubmit = !saving && !isPartial

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <NavRow step={3} total={4} onBack={onBack} onSkip={onSkip} />

      <div
        className="mb-3.5 inline-flex items-center gap-1.5 self-start"
        style={{
          padding: "6px 12px",
          borderRadius: 999,
          background: INK_SOFT,
          border: `1px solid ${INK}33`,
          fontSize: 12,
          fontWeight: 700,
          color: INK,
          textTransform: "uppercase",
          letterSpacing: 1.4,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: 999, background: INK }} />
        Opcional
      </div>

      <DisplayHeading>
        Datos para<br />que te paguen
      </DisplayHeading>
      <Subtitle>
        Los compartimos al final para que tus amigos te transfieran sin pedirlos.
      </Subtitle>

      <div className="mt-8">
        <TransferFields value={value} onChange={onChange} />
      </div>

      {isPartial && (
        <div
          className="mt-5"
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "#FEF3C7",
            border: "1px solid #F59E0B55",
            color: "#92400E",
            fontSize: 13,
            lineHeight: 1.45,
            letterSpacing: -0.1,
          }}
        >
          Completa <b>nombre</b>, <b>RUT</b>, <b>banco</b>, <b>tipo</b> y <b>número</b> — o déjalos todos en blanco para omitir.
        </div>
      )}

      <div className="mt-auto pt-10">
        <PrimaryButton onClick={onSubmit} disabled={!canSubmit}>
          {saving ? "Creando…" : "Guardar y terminar"}
        </PrimaryButton>
      </div>
    </div>
  )
}
