import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import BillClient from "./BillClient"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("bills").select("nombre, creador_nombre").eq("slug", slug).single()
  if (!data) return { title: "Cuenta no encontrada" }
  return {
    title: `${data.nombre} — YoPago`,
    description: `Divide esta cuenta con tus amigos. Organizado por ${data.creador_nombre || "alguien"}.`,
  }
}

export default async function BillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: bill } = await supabase
    .from("bills")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!bill) notFound()

  const [{ data: items }, { data: participants }, { data: assignments }] = await Promise.all([
    supabase.from("items").select("*").eq("bill_id", bill.id).order("orden"),
    supabase.from("participants").select("*").eq("bill_id", bill.id).order("created_at"),
    supabase.from("item_assignments").select("*").in(
      "item_id",
      (await supabase.from("items").select("id").eq("bill_id", bill.id)).data?.map(i => i.id) ?? []
    ),
  ])

  return (
    <BillClient
      bill={bill}
      initialItems={items ?? []}
      initialParticipants={participants ?? []}
      initialAssignments={assignments ?? []}
    />
  )
}
