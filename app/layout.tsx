import type { Metadata } from "next"
import { Geist, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { INK, INK_SOFT, INK_DEEP } from "@/lib/design-tokens"
import { Analytics } from "@vercel/analytics/next"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-instrument",
})

export const metadata: Metadata = {
  title: "yo/pago — divide sin drama",
  description: "Comparte gastos con amigos sin registro ni login. Genera un link y listo.",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`h-full ${geist.variable} ${instrument.variable}`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: INK_SOFT,
              color: INK_DEEP,
              border: `1px solid ${INK}22`,
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
