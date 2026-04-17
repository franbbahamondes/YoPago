import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos de Uso — YoPago",
  description: "Términos y condiciones de uso del servicio YoPago.",
}

export default function TerminosPage() {
  const fecha = "17 de abril de 2025"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
          <h1 className="text-2xl font-bold">Términos de Uso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Última actualización: {fecha}</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul>li]:text-sm [&_ul>li]:leading-relaxed [&_ul>li]:text-muted-foreground">

          <section>
            <h2>1. Descripción del servicio</h2>
            <p>
              YoPago es una herramienta gratuita que permite dividir cuentas y gastos compartidos entre
              personas sin necesidad de registro. Al crear una cuenta (evento), el usuario acepta estos
              términos en su totalidad.
            </p>
          </section>

          <section>
            <h2>2. Uso aceptable</h2>
            <p>
              YoPago es un servicio de organización personal de gastos. No somos una entidad financiera,
              no procesamos pagos ni actuamos como intermediario en transferencias bancarias. La
              información de transferencia que el usuario ingresa se muestra como referencia para los
              participantes de cada cuenta; YoPago no verifica, valida ni garantiza dichos datos.
            </p>
            <p className="mt-2">
              El usuario es responsable de la veracidad de la información que ingresa y de cualquier
              transacción económica que realice fuera de la plataforma.
            </p>
          </section>

          <section>
            <h2>3. Privacidad y datos personales</h2>
            <p>
              Al usar YoPago, el usuario puede ingresar voluntariamente datos como nombre, RUT, banco,
              número de cuenta y correo electrónico. Esta información se almacena en nuestros servidores
              con el único fin de mostrarla a los participantes del evento correspondiente.
            </p>
            <p className="mt-2">
              YoPago no vende ni cede datos personales a terceros con fines comerciales ajenos al
              servicio. Los datos pueden ser eliminados previa solicitud al correo de contacto.
            </p>
          </section>

          <section>
            <h2>4. Comunicaciones y marketing</h2>
            <p>
              Al aceptar estos términos, el usuario autoriza expresamente a YoPago a utilizar el correo
              electrónico ingresado para:
            </p>
            <ul>
              <li>Enviar novedades, actualizaciones y nuevas funcionalidades del servicio.</li>
              <li>Comunicar ofertas, lanzamientos o información de interés relacionada con YoPago.</li>
              <li>Realizar encuestas de satisfacción y estudios de uso del producto.</li>
            </ul>
            <p className="mt-2">
              El usuario puede revocar este consentimiento en cualquier momento respondiendo el correo
              recibido con la palabra "DESUSCRIBIR" o escribiendo a{" "}
              <a href="mailto:hola@yo-pago.app" className="underline underline-offset-2">
                hola@yo-pago.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2>5. Propiedad intelectual</h2>
            <p>
              El nombre YoPago, su logotipo, interfaz y código fuente son propiedad de sus creadores.
              Queda prohibida su reproducción total o parcial sin autorización escrita.
            </p>
          </section>

          <section>
            <h2>6. Limitación de responsabilidad</h2>
            <p>
              YoPago se provee "tal cual" (as-is), sin garantías de disponibilidad continua ni ausencia
              de errores. No nos hacemos responsables por pérdidas económicas derivadas del uso o mal
              uso del servicio, errores en los datos ingresados por los usuarios, ni por transferencias
              realizadas a cuentas incorrectas.
            </p>
            <p className="mt-2">
              Durante el período de MVP (producto en etapa de prueba), el servicio puede presentar
              interrupciones o cambios sin previo aviso.
            </p>
          </section>

          <section>
            <h2>7. Modificaciones</h2>
            <p>
              YoPago se reserva el derecho de modificar estos términos en cualquier momento. Los cambios
              entrarán en vigencia al publicarse en esta página. El uso continuado del servicio implica
              la aceptación de los términos vigentes.
            </p>
          </section>

          <section>
            <h2>8. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa se
              someterá a los tribunales competentes de la ciudad de Santiago.
            </p>
          </section>

          <section>
            <h2>9. Contacto</h2>
            <p>
              Para consultas, solicitudes de eliminación de datos o cualquier otro asunto relacionado
              con estos términos, escríbenos a{" "}
              <a href="mailto:hola@yo-pago.app" className="underline underline-offset-2">
                hola@yo-pago.app
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
