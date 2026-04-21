"use client"

import { BANCOS, FieldLabel, TIPOS_CUENTA, UnderlineInput, UnderlineSelect } from "@/components/form-primitives"

export type TransferFieldsValue = {
  nombre: string
  rut: string
  banco: string
  tipo_cuenta: string
  numero: string
  email: string
  alias: string
}

export const EMPTY_TRANSFER: TransferFieldsValue = {
  nombre: "",
  rut: "",
  banco: "",
  tipo_cuenta: "",
  numero: "",
  email: "",
  alias: "",
}

export default function TransferFields({
  value,
  onChange,
}: {
  value: TransferFieldsValue
  onChange: (next: TransferFieldsValue) => void
}) {
  const set = <K extends keyof TransferFieldsValue>(k: K) => (v: string) =>
    onChange({ ...value, [k]: v })

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel>Nombre</FieldLabel>
        <UnderlineInput value={value.nombre} onChange={set("nombre")} placeholder="Juan Alcayaga" />
      </div>
      <div>
        <FieldLabel>RUT</FieldLabel>
        <UnderlineInput value={value.rut} onChange={set("rut")} placeholder="12.345.678-9" />
      </div>
      <div>
        <FieldLabel>Banco</FieldLabel>
        <UnderlineSelect value={value.banco} onChange={set("banco")} options={BANCOS} placeholder="Selecciona…" />
      </div>
      <div className="flex gap-4">
        <div style={{ flex: 1 }}>
          <FieldLabel>Tipo de cuenta</FieldLabel>
          <UnderlineSelect value={value.tipo_cuenta} onChange={set("tipo_cuenta")} options={TIPOS_CUENTA} placeholder="—" />
        </div>
        <div style={{ flex: 1.4 }}>
          <FieldLabel>Nº de cuenta</FieldLabel>
          <UnderlineInput value={value.numero} onChange={set("numero")} inputMode="numeric" placeholder="00123456789" />
        </div>
      </div>
      <div>
        <FieldLabel>Email (opcional)</FieldLabel>
        <UnderlineInput value={value.email} onChange={set("email")} type="email" inputMode="email" placeholder="tucorreo@ejemplo.com" />
      </div>
      <div>
        <FieldLabel>Alias (opcional)</FieldLabel>
        <UnderlineInput value={value.alias} onChange={set("alias")} placeholder="opcional" />
      </div>
    </div>
  )
}
