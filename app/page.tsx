import CreateBillForm from "@/components/CreateBillForm"
import { Receipt } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto max-w-md px-5 pt-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none">YoPago</h1>
            <p className="text-sm text-muted-foreground">Divide sin drama</p>
          </div>
        </div>
        <CreateBillForm />
      </div>
    </div>
  )
}
