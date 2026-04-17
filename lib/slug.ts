import { customAlphabet } from "nanoid"

// URL-safe, no ambiguous chars (0O1lI)
const nanoid = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8)

export function generateSlug(): string {
  return nanoid()
}
