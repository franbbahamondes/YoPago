export const formatCLP = (n: number): string => {
  const rounded = Math.round(n || 0)
  return "$" + rounded.toLocaleString("es-CL")
}

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const PALETTE = [
  "oklch(0.7 0.15 155)",
  "oklch(0.7 0.15 50)",
  "oklch(0.7 0.15 280)",
  "oklch(0.7 0.15 25)",
  "oklch(0.7 0.15 220)",
  "oklch(0.7 0.15 330)",
  "oklch(0.7 0.15 100)",
  "oklch(0.7 0.15 195)",
]

export const colorFor = (id: string): string => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
