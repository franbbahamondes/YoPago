import { NextRequest, NextResponse } from "next/server"
import { getPostHogClient } from "@/lib/posthog-server"

const MODEL = "claude-sonnet-4-5"

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 })
  }

  let imageUrl: string
  try {
    const body = await req.json()
    imageUrl = body.imageUrl
    if (!imageUrl) throw new Error("imageUrl requerida")
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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
        "Eres un asistente que extrae items de boletas/recibos de restaurantes en Chile. Extrae cada producto con su nombre limpio (sin códigos), precio unitario en pesos chilenos (entero, sin decimales ni puntos) y cantidad. No incluyas el total general, propinas ni cargos por servicio. Solo productos consumidos. Si hay descuentos por item, inclúyelos en discount_amount.",
      tools: [
        {
          name: "extract_items",
          description: "Devuelve la lista de items de la boleta",
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
                    quantity: { type: "integer", description: "Cantidad", minimum: 1 },
                    discount_amount: { type: "number", description: "Descuento en CLP aplicado al item (0 si no hay)" },
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
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: "Extrae los items de esta boleta." },
          ],
        },
      ],
    }),
  })

  const distinctId = req.headers.get("x-posthog-distinct-id") ?? "anonymous"

  if (response.status === 429) {
    getPostHogClient().capture({
      distinctId,
      event: "receipt_extraction_failed",
      properties: { reason: "rate_limit", status: 429 },
    })
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en unos segundos." }, { status: 429 })
  }
  if (response.status === 401 || response.status === 403) {
    getPostHogClient().capture({
      distinctId,
      event: "receipt_extraction_failed",
      properties: { reason: "auth_error", status: response.status },
    })
    return NextResponse.json({ error: "API key de Anthropic inválida." }, { status: 402 })
  }
  if (!response.ok) {
    const text = await response.text()
    console.error("Anthropic error:", response.status, text)
    getPostHogClient().capture({
      distinctId,
      event: "receipt_extraction_failed",
      properties: { reason: "api_error", status: response.status },
    })
    return NextResponse.json({ error: "Error procesando la imagen" }, { status: 500 })
  }

  const data = await response.json()
  const toolUse = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use") as
    | { input?: { items?: unknown[] } }
    | undefined

  const items = (toolUse?.input?.items ?? []) as {
    name: string
    price: number
    quantity: number
    discount_amount?: number
  }[]

  getPostHogClient().capture({
    distinctId,
    event: "receipt_extraction_completed",
    properties: { items_extracted: items.length },
  })

  return NextResponse.json({ items })
}
