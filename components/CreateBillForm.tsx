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
import type { Json, DatosTransferencia } from "@/types/database"
import { toast } from "sonner"

const BANCOS = [
  "Banco de Chile", "BancoEstado", "Santander", "BCI", "Itaú", "Scotiabank",
  "BICE", "Falabella", "Ripley", "Consorcio", "Security", "Internacional",
  "Coopeuch", "Otro",
]
const TIPOS_CUENTA = ["Cuenta Vista", "Cuenta Corriente", "Cuenta RUT", "Cuenta de Ahorro"]
const SUGERENCIAS = ["🍝 Cena", "🍻 Previa", "🏖️ Viaje", "🏠 Arriendo", "🎂 Cumpleaños"]

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

const INK = "#3730A3"
const INK_DEEP = "#1E1B4B"
const INK_SOFT = "#EEF0FB"
const TEXT = "#0A0A0A"
const MUTED = "#6B7280"
const LINE = "#E5E7EB"

type Step = 0 | 1 | 2 | 3 | 4

export default function CreateBillForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)

  const [nombre, setNombre] = useState("")
  const [otrosParticipantes, setOtrosParticipantes] = useState<string[]>([])
  const [nuevoInvitado, setNuevoInvitado] = useState("")

  const [creadorNombre, setCreadorNombre] = useState("")
  const [banco, setBanco] = useState("")
  const [tipoCuenta, setTipoCuenta] = useState("")
  const [numero, setNumero] = useState("")
  const [rut, setRut] = useState("")
  const [email, setEmail] = useState("")
  const [alias, setAlias] = useState("")

  useEffect(() => {
    const saved = getSavedBank()
    if (saved) {
      setCreadorNombre(saved.nombre)
      setBanco(saved.banco)
      setTipoCuenta(saved.tipo_cuenta)
      setNumero(saved.numero)
      setRut(saved.rut)
      setEmail(saved.email)
      setAlias(saved.alias)
    }
  }, [])

  const next = () => setStep((s) => Math.min(4, s + 1) as Step)
  const back = () => setStep((s) => Math.max(0, s - 1) as Step)

  const agregarInvitado = () => {
    const v = nuevoInvitado.trim()
    if (!v) return
    setOtrosParticipantes((p) => [...p, v])
    setNuevoInvitado("")
  }
  const eliminarInvitado = (i: number) =>
    setOtrosParticipantes((p) => p.filter((_, idx) => idx !== i))

  const crearCuenta = async () => {
    if (!nombre.trim()) {
      toast.error("Ponle un nombre al evento")
      setStep(2)
      return
    }
    const creadorName = creadorNombre.trim() || "Yo"
    const otros = otrosParticipantes.map((p) => p.trim()).filter(Boolean)

    setSaving(true)
    try {
      const supabase = createClient()
      const slug = generateSlug()
      const clientId = getClientId()

      const datosTransferencia: DatosTransferencia = {
        nombre: creadorNombre.trim(),
        banco: banco.trim(),
        tipo_cuenta: tipoCuenta.trim(),
        numero: numero.trim(),
        rut: rut.trim(),
        email: email.trim(),
        alias: alias.trim(),
      }

      const { data: bill, error } = await supabase
        .from("bills")
        .insert({
          slug,
          nombre: nombre.trim(),
          creador_nombre: creadorNombre.trim() || null,
          datos_transferencia: datosTransferencia as unknown as Json,
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

      saveBank(datosTransferencia)
      addOwnedBill(slug)
      setBillIdentity(slug, { participantId: creadorParticipant.id, name: creadorName })

      posthog.identify(clientId, {
        name: creadorName,
        ...(email.trim() ? { email: email.trim() } : {}),
      })
      posthog.capture("bill_created", {
        bill_slug: slug,
        event_name: nombre.trim(),
        participant_count: 1 + otros.length,
        has_transfer_data: !!(banco.trim() || numero.trim()),
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
      {step === 1 && <HowItWorks onBack={back} onContinue={next} />}
      {step === 2 && (
        <EventName
          nombre={nombre}
          setNombre={setNombre}
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
      {step === 3 && (
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
      {step === 4 && (
        <Transfer
          creadorNombre={creadorNombre} setCreadorNombre={setCreadorNombre}
          rut={rut} setRut={setRut}
          banco={banco} setBanco={setBanco}
          tipoCuenta={tipoCuenta} setTipoCuenta={setTipoCuenta}
          numero={numero} setNumero={setNumero}
          email={email} setEmail={setEmail}
          alias={alias} setAlias={setAlias}
          saving={saving}
          onBack={back}
          onSubmit={crearCuenta}
          onSkip={() => {
            setCreadorNombre("")
            setBanco("")
            setTipoCuenta("")
            setNumero("")
            setRut("")
            setEmail("")
            setAlias("")
            crearCuenta()
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

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: MUTED,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function UnderlineInput({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: "text" | "numeric" | "email" | "tel"
  autoFocus?: boolean
}) {
  const focused = value.length > 0 || autoFocus
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full bg-transparent outline-none"
      style={{
        borderBottom: `2px solid ${focused ? INK : TEXT}`,
        padding: "0 0 12px 0",
        fontSize: 22,
        fontWeight: 600,
        color: TEXT,
        letterSpacing: -0.4,
        lineHeight: 1.2,
      }}
    />
  )
}

function UnderlineSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  options: string[]
}) {
  const focused = !!value
  return (
    <div
      style={{
        position: "relative",
        borderBottom: `2px solid ${focused ? INK : TEXT}`,
        paddingBottom: 12,
      }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent outline-none"
        style={{
          border: "none",
          padding: 0,
          fontSize: 22,
          fontWeight: 600,
          color: value ? TEXT : MUTED,
          letterSpacing: -0.4,
          lineHeight: 1.2,
        }}
      >
        <option value="">{placeholder || "Selecciona…"}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 8,
          pointerEvents: "none",
        }}
      >
        <svg width="12" height="8" viewBox="0 0 12 8">
          <path
            d="M1 1l5 5 5-5"
            stroke={MUTED}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Step 0 — Welcome
// ─────────────────────────────────────────────

function Welcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <Logo size={40} />
        <h1
          className="font-sans"
          style={{
            marginTop: 36,
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: -1.5,
            lineHeight: 0.98,
            color: TEXT,
          }}
        >
          Divídelo<br />sin drama.
        </h1>
        <p
          style={{
            marginTop: 18,
            fontSize: 17,
            lineHeight: 1.45,
            color: MUTED,
            letterSpacing: -0.2,
            maxWidth: 320,
          }}
        >
          La manera más rápida de dividir una cuenta, sin registro, sin descargas.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <PrimaryButton onClick={onContinue}>Crear cuenta</PrimaryButton>
        <div
          className="text-center"
          style={{
            fontSize: 14,
            color: MUTED,
            padding: "10px 0",
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

// ─────────────────────────────────────────────
// Step 1 — How it works
// ─────────────────────────────────────────────

function HowItWorks({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const steps = [
    { n: "01", title: "Sube la boleta", body: "Toma una foto y leemos los ítems automáticamente.", preview: <ReceiptPreview /> },
    { n: "02", title: "Asigna cada ítem", body: "Toca quién pidió qué. Los totales se calculan solos.", preview: <AssignPreview /> },
    { n: "03", title: "Cobra sin perseguir a nadie", body: "Cada invitado ve cuánto te debe y cómo transferirte.", preview: <TransferPreview /> },
  ]
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <NavRow step={0} onBack={onBack} />

      <DisplayHeading>
        Así funciona<br />YoPago
      </DisplayHeading>

      <div className="mt-8 flex flex-col gap-3.5">
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex items-center gap-3.5 p-3.5"
            style={{
              borderRadius: 18,
              background: "#fff",
              border: `1px solid ${LINE}`,
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 12,
                background: INK_SOFT,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {s.preview}
            </div>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 11, fontWeight: 700, color: INK, letterSpacing: 1.5, marginBottom: 4 }}>
                {s.n}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: TEXT, letterSpacing: -0.3, marginBottom: 4 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.4, letterSpacing: -0.05 }}>
                {s.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-10">
        <PrimaryButton onClick={onContinue}>Empezar</PrimaryButton>
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
  onBack,
  onContinue,
}: {
  nombre: string
  setNombre: (v: string) => void
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <NavRow step={1} onBack={onBack} />

      <DisplayHeading>
        ¿Cómo se llama<br />este evento?
      </DisplayHeading>
      <Subtitle>Dale un nombre para encontrarlo después.</Subtitle>

      <div className="mt-10">
        <FieldLabel>Nombre del evento</FieldLabel>
        <UnderlineInput
          value={nombre}
          onChange={setNombre}
          placeholder="Cena del viernes"
          autoFocus
        />
      </div>

      <div className="mt-7">
        <FieldLabel>Sugerencias</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              onClick={() => setNombre(s.replace(/^\S+\s*/, ""))}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                background: "#fff",
                border: `1px solid ${LINE}`,
                fontSize: 14,
                color: TEXT,
                letterSpacing: -0.1,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
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
      <NavRow step={2} onBack={onBack} />

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
  creadorNombre, setCreadorNombre,
  rut, setRut,
  banco, setBanco,
  tipoCuenta, setTipoCuenta,
  numero, setNumero,
  email, setEmail,
  alias, setAlias,
  saving,
  onBack,
  onSubmit,
  onSkip,
}: {
  creadorNombre: string
  setCreadorNombre: (v: string) => void
  rut: string
  setRut: (v: string) => void
  banco: string
  setBanco: (v: string) => void
  tipoCuenta: string
  setTipoCuenta: (v: string) => void
  numero: string
  setNumero: (v: string) => void
  email: string
  setEmail: (v: string) => void
  alias: string
  setAlias: (v: string) => void
  saving: boolean
  onBack: () => void
  onSubmit: () => void
  onSkip: () => void
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <NavRow step={3} onBack={onBack} onSkip={onSkip} />

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

      <div className="mt-8 flex flex-col gap-5">
        <div>
          <FieldLabel>Nombre</FieldLabel>
          <UnderlineInput value={creadorNombre} onChange={setCreadorNombre} placeholder="Juan Alcayaga" />
        </div>
        <div>
          <FieldLabel>RUT</FieldLabel>
          <UnderlineInput value={rut} onChange={setRut} placeholder="12.345.678-9" />
        </div>
        <div>
          <FieldLabel>Banco</FieldLabel>
          <UnderlineSelect
            value={banco}
            onChange={setBanco}
            options={BANCOS}
            placeholder="Selecciona…"
          />
        </div>
        <div className="flex gap-4">
          <div style={{ flex: 1 }}>
            <FieldLabel>Tipo</FieldLabel>
            <UnderlineSelect
              value={tipoCuenta}
              onChange={setTipoCuenta}
              options={TIPOS_CUENTA}
              placeholder="—"
            />
          </div>
          <div style={{ flex: 1.4 }}>
            <FieldLabel>N° de cuenta</FieldLabel>
            <UnderlineInput value={numero} onChange={setNumero} inputMode="numeric" placeholder="00123456789" />
          </div>
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <UnderlineInput value={email} onChange={setEmail} type="email" inputMode="email" placeholder="tucorreo@ejemplo.com" />
        </div>
        <div>
          <FieldLabel>Alias</FieldLabel>
          <UnderlineInput value={alias} onChange={setAlias} placeholder="opcional" />
        </div>
      </div>

      <div className="mt-auto pt-10">
        <PrimaryButton onClick={onSubmit} disabled={saving}>
          {saving ? "Creando…" : "Guardar y terminar"}
        </PrimaryButton>
      </div>
    </div>
  )
}
