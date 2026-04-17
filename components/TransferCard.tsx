"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { DatosTransferencia } from "@/types/database"
import { toast } from "sonner"
import { Copy, Banknote } from "lucide-react"

interface Props {
  datos: DatosTransferencia
  billNombre?: string
  amount?: number
  shareUrl?: string
}

export default function TransferCard({ datos, billNombre, amount, shareUrl }: Props) {
  const fields = [
    { label: "Titular", value: datos.nombre },
    { label: "RUT", value: datos.rut },
    { label: "Banco", value: datos.banco },
    { label: "Tipo de cuenta", value: datos.tipo_cuenta },
    { label: "N° de cuenta", value: datos.numero },
    { label: "Email", value: datos.email },
    { label: "Alias", value: datos.alias },
  ].filter(f => f.value)

  const copyAll = () => {
    const text = fields.map(f => `${f.label}: ${f.value}`).join("\n")
    navigator.clipboard.writeText(text)
    toast.success("Datos copiados")
  }

  const whatsappMsg = shareUrl
    ? encodeURIComponent(`Entra a la cuenta "${billNombre}": ${shareUrl}`)
    : null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          Transferir a {datos.nombre || "organizador"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {fields.map(f => (
          <div key={f.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium">{f.value}</span>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={copyAll}>
            <Copy className="h-3.5 w-3.5" /> Copiar datos
          </Button>
          {whatsappMsg && (
            <a
              href={`https://wa.me/?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#25D366] bg-[#25D366]/10 px-3 py-1.5 text-sm font-medium text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
