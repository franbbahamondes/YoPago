import { NextRequest, NextResponse } from "next/server"
import { getPostHogClient } from "@/lib/posthog-server"

export const maxDuration = 60

const MODEL = "claude-sonnet-4-5"

/** Wraps PostHog capture so analytics never crashes the route */
function track(distinctId: string, event: string, properties: Record<string, unknown>) {
  try { getPostHogClient().capture({ distinctId, event, properties }) } catch { /* non-critical */ }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 })
  }

  const distinctId = req.headers.get("x-posthog-distinct-id") ?? "anonymous"

  // Parse body
  let base64Image: string
  try {
    const body = await req.json()
    base64Image = body.base64Image
    if (!base64Image || typeof base64Image !== "string") throw new Error("base64Image requerida")
  } catch {
    return NextResponse.json({ error: "Body inválido: se requiere base64Image" }, { status: 400 })
  }

  // Call Anthropic — wrapped in try/catch so network errors return clean JSON
  let response: Response
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system:
          "Eres un asistente experto en leer boletas y recibos de restaurantes chilenos. Extrae cada producto pedido: nombre limpio (sin códigos internos), precio unitario en pesos chilenos (número entero, sin puntos ni comas), cantidad y descuento si lo hay. Ignora propinas, cargos por servicio y totales. Solo ítems individuales consumidos.",
        tools: [
          {
            name: "extract_items",
            description: "Devuelve la lista de ítems de la boleta",
            input_schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nombre del producto" },
                      price: { type: "number", description: "Precio unitario en CLP, entero" },
                      quantity: { type: "integer", description: "Cantidad pedida", minimum: 1 },
                      discount_amount: { type: "number", description: "Descuento en CLP aplicado al ítem (0 si no hay)" },
                    },
                    required: ["name", "price", "quantity"],
                  },
                },
              },
              required: ["items"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_items" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Image } },
              { type: "text", text: "Extrae todos los ítems de esta boleta de restaurante." },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    console.error("Anthropic fetch failed:", err)
    track(distinctId, "receipt_extraction_failed", { reason: "network_error", error: String(err) })
    return NextResponse.json({ error: "No se pudo conectar con el servicio de IA. Intenta de nuevo." }, { status: 503 })
  }

  // Handle Anthropic error responses
  if (response.status === 429) {
    track(distinctId, "receipt_extraction_failed", { reason: "rate_limit", status: 429 })
    return NextResponse.json({ error: "Demasiadas solicitudes. Espera unos segundos e intenta de nuevo." }, { status: 429 })
  }
  if (response.status === 401 || response.status === 403) {
    track(distinctId, "receipt_extraction_failed", { reason: "auth_error", status: response.status })
    return NextResponse.json({ error: "API key de Anthropic inválida." }, { status: 402 })
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    console.error(`Anthropic ${response.status}:`, detail)
    track(distinctId, "receipt_extraction_failed", { reason: "api_error", status: response.status, detail: detail.slice(0, 300) })
    return NextResponse.json(
      { error: `Error del servicio de IA (${response.status}). Intenta de nuevo o sube la foto con mejor iluminación.` },
      { status: 500 }
    )
  }

  // Parse Anthropic response
  let data: { content?: { type: string; input?: { items?: unknown[] } }[] }
  try {
    data = await response.json()
  } catch {
    return NextResponse.json({ error: "Respuesta inesperada del servicio de IA." }, { status: 500 })
  }

  const toolUse = (data.content ?? []).find(b => b.type === "tool_use")
  const items = (toolUse?.input?.items ?? []) as {
    name: string
    price: number
    quantity: number
    discount_amount?: number
  }[]

  track(distinctId, "receipt_extraction_completed", { items_extracted: items.length })

  return NextResponse.json({ items })
}
