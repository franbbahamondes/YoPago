"use client"

import type { ReactNode } from "react"
import { INK, TEXT, MUTED } from "@/lib/design-tokens"

export function FieldLabel({ children }: { children: ReactNode }) {
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

export function UnderlineInput({
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

export function UnderlineSelect({
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

export const BANCOS = [
  "Banco de Chile", "BancoEstado", "Santander", "BCI", "Itaú", "Scotiabank",
  "BICE", "Falabella", "Ripley", "Consorcio", "Security", "Internacional",
  "Coopeuch", "Otro",
]

export const TIPOS_CUENTA = ["Cuenta Vista", "Cuenta Corriente", "Cuenta RUT", "Cuenta de Ahorro"]
