"use client"

import { initials, colorFor } from "@/lib/format"
import type { Participant } from "@/types/database"

interface Props {
  participant: Participant
  selected: boolean
  onClick: () => void
}

export default function ParticipantChip({ participant, selected, onClick }: Props) {
  const color = colorFor(participant.id)
  return (
    <button
      onClick={onClick}
      title={participant.nombre}
      style={{ backgroundColor: selected ? color : "transparent", borderColor: color }}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
        selected ? "text-white shadow-sm" : "text-foreground"
      }`}
    >
      {initials(participant.nombre)}
    </button>
  )
}
