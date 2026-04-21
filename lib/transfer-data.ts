import type { TransferData, TransferDataRow } from "@/types/database"

export const REQUIRED_TRANSFER_FIELDS = ["nombre", "rut", "banco", "tipo_cuenta", "numero"] as const
export type RequiredTransferField = (typeof REQUIRED_TRANSFER_FIELDS)[number]

export type TransferStatus = "empty" | "partial" | "complete"

export type TransferLike = {
  nombre?: string | null
  rut?: string | null
  banco?: string | null
  tipo_cuenta?: string | null
  numero?: string | null
  email?: string | null
  alias?: string | null
}

/**
 * All-or-nothing: o los 5 requeridos están todos presentes, o todos vacíos.
 * Ignora email y alias — son opcionales y no afectan el estado.
 */
export function transferStatus(d: TransferLike | null | undefined): TransferStatus {
  if (!d) return "empty"
  const values = REQUIRED_TRANSFER_FIELDS.map(k => (d[k] ?? "").trim())
  if (values.every(v => v === "")) return "empty"
  if (values.every(v => v !== "")) return "complete"
  return "partial"
}

/** true si los 5 requeridos están presentes — safe para renderizar TransferCard */
export function isCompleteTransfer(d: TransferLike | null | undefined): boolean {
  return transferStatus(d) === "complete"
}

/** Normaliza una fila DB o un objeto de form a TransferData. Devuelve null si está incompleto. */
export function toTransferData(d: TransferDataRow | TransferLike | null | undefined): TransferData | null {
  if (!d || !isCompleteTransfer(d)) return null
  return {
    nombre: (d.nombre ?? "").trim(),
    rut: (d.rut ?? "").trim(),
    banco: (d.banco ?? "").trim(),
    tipo_cuenta: (d.tipo_cuenta ?? "").trim(),
    numero: (d.numero ?? "").trim(),
    email: d.email?.trim() || null,
    alias: d.alias?.trim() || null,
  }
}
