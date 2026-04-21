import { v4 as uuidv4 } from "uuid"

const KEY_CLIENT_ID = "yopago_client_id"
const KEY_BILL_NAMES = "yopago_bill_names" // { [slug]: { participantId, name } }
const KEY_OWNED_BILLS = "yopago_owned_bills" // [slug]
const KEY_BANK = "yopago_bank_info"

export function getClientId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem(KEY_CLIENT_ID)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(KEY_CLIENT_ID, id)
  }
  return id
}

export type BillIdentity = { participantId: string; name: string }

export function getBillIdentity(slug: string): BillIdentity | null {
  if (typeof window === "undefined") return null
  try {
    const all = JSON.parse(localStorage.getItem(KEY_BILL_NAMES) || "{}")
    return all[slug] ?? null
  } catch {
    return null
  }
}

export function setBillIdentity(slug: string, identity: BillIdentity) {
  const all = (() => {
    try { return JSON.parse(localStorage.getItem(KEY_BILL_NAMES) || "{}") }
    catch { return {} }
  })()
  all[slug] = identity
  localStorage.setItem(KEY_BILL_NAMES, JSON.stringify(all))
}

export function addOwnedBill(slug: string) {
  const list: string[] = (() => {
    try { return JSON.parse(localStorage.getItem(KEY_OWNED_BILLS) || "[]") }
    catch { return [] }
  })()
  if (!list.includes(slug)) {
    list.unshift(slug)
    localStorage.setItem(KEY_OWNED_BILLS, JSON.stringify(list.slice(0, 50)))
  }
}

export function isOwnedBill(slug: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const list = JSON.parse(localStorage.getItem(KEY_OWNED_BILLS) || "[]")
    return list.includes(slug)
  } catch {
    return false
  }
}

export type BankInfo = {
  nombre: string
  rut: string
  banco: string
  tipo_cuenta: string
  numero: string
  email?: string
  alias?: string
}

export function getSavedBank(): BankInfo | null {
  if (typeof window === "undefined") return null
  try { return JSON.parse(localStorage.getItem(KEY_BANK) || "null") }
  catch { return null }
}

/**
 * Guarda solo si los 5 requeridos están completos.
 * Prefill del próximo wizard → nunca se rellena con data parcial.
 */
export function saveBank(info: BankInfo) {
  const required = [info.nombre, info.rut, info.banco, info.tipo_cuenta, info.numero]
  if (required.some(v => !v || !v.trim())) return
  localStorage.setItem(KEY_BANK, JSON.stringify(info))
}
