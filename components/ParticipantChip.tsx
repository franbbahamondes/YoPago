"use client"

import { initials, colorFor } from "@/lib/format"
import { INK, LINE, MUTED } from "@/lib/design-tokens"
import type { Participant } from "@/types/database"

interface Props {
  participant: Participant
  selected: boolean
  isMe?: boolean
  onClick: () => void
}

// iOS-style name chip: avatar + label.
//  - inactive: white pill, grey border, grey text
//  - inactive + isMe: dashed indigo border, indigo text
//  - active: filled person-color pill, white text
//  - active + isMe: filled indigo pill, solid indigo border for emphasis
export default function ParticipantChip({ participant, selected, isMe, onClick }: Props) {
  const color = isMe ? INK : colorFor(participant.id)
  const label = isMe ? "Tú" : participant.nombre

  return (
    <button
      type="button"
      onClick={onClick}
      title={participant.nombre}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px 5px 5px", borderRadius: 999,
        background: selected ? color : "#fff",
        border: selected
          ? (isMe ? `2px solid ${INK}` : "none")
          : (isMe ? `1.5px dashed ${INK}` : `1px solid ${LINE}`),
        fontSize: 13, fontWeight: isMe ? 700 : 500,
        color: selected ? "#fff" : (isMe ? INK : MUTED),
        letterSpacing: -0.05,
        transition: "all 150ms ease",
      }}
    >
      <span
        style={{
          width: 20, height: 20, borderRadius: 999,
          background: selected ? "rgba(255,255,255,0.2)" : color,
          color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700,
        }}
      >{initials(participant.nombre).charAt(0)}</span>
      {label}
    </button>
  )
}
