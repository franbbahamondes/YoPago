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
            <h2>3. Tratamiento de datos personales</h2>
            <p>
              Al usar YoPago, el usuario puede ingresar voluntariamente datos como nombre, RUT, banco,
              número de cuenta y correo electrónico. Esta información se almacena en nuestros servidores
              con el fin de mostrarla a los participantes del evento correspondiente.
            </p>
            <p className="mt-2">
              Los datos pueden ser eliminados previa solicitud escrita al correo de contacto indicado en
              estos términos.
            </p>
          </section>

          <section>
            <h2>4. Consentimiento para la comunicación de datos a terceros</h2>
            <p>
              <strong>Cláusula de monetización (Ley N° 19.628 y Ley N° 21.719):</strong> Al aceptar
              expresamente la casilla de términos, el Usuario autoriza a YoPago para que proceda a la
              comunicación, cesión o venta de sus datos personales —excluyendo datos sensibles— a
              terceros destinatarios (tales como instituciones financieras, empresas de retail y agencias
              de análisis de mercado) con la finalidad de elaboración de perfiles comerciales y oferta de
              servicios dirigidos.
            </p>
            <p className="mt-2">
              <strong>Carácter específico:</strong> Esta autorización es independiente de la aceptación
              de los Términos y Condiciones de uso de la Aplicación. El Usuario podrá revocar este
              consentimiento en cualquier momento escribiendo a{" "}
              <a href="mailto:franbravobahamondes@gmail.com" className="underline underline-offset-2">
                franbravobahamondes@gmail.com
              </a>
              , sin que ello afecte la prestación del servicio base de división de cuentas.
            </p>
          </section>

          <section>
            <h2>5. Comunicaciones y marketing</h2>
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
              <a href="mailto:franbravobahamondes@gmail.com" className="underline underline-offset-2">
                franbravobahamondes@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2>6. Uso de información disociada (anonimización)</h2>
            <p>
              YoPago podrá someter la información transaccional de los usuarios a procesos de disociación
              o anonimización irreversible. De conformidad con el artículo 2° letra o) de la Ley N°
              19.628, la información que haya sido despojada de su carácter personal mediante técnicas
              que impidan la identificación del titular podrá ser utilizada y comercializada libremente
              por la Aplicación para fines estadísticos, de mercado o de investigación.
            </p>
          </section>

          <section>
            <h2>7. Propiedad intelectual</h2>
            <p>
              El nombre YoPago, su logotipo, interfaz y código fuente son propiedad de sus creadores.
              Queda prohibida su reproducción total o parcial sin autorización escrita.
            </p>
          </section>

          <section>
            <h2>8. Seguridad, secreto y limitación de responsabilidad</h2>
            <p>
              <strong>Seguridad y deber de secreto:</strong> YoPago garantiza que el tratamiento de los
              datos personales se realizará bajo estrictas medidas de seguridad técnica y organizativa
              para prevenir el acceso no autorizado. Quienes participen en cualquier etapa del
              tratamiento de datos personales están obligados al secreto profesional, obligación que no
              cesa por el término de sus actividades en la Aplicación (Art. 7° Ley N° 19.628).
            </p>
            <p className="mt-2">
              <strong>Limitación ante terceros:</strong> En caso de comunicación lícita de datos, los
              terceros receptores asumirán la calidad de responsables de datos, quedando obligados a
              utilizarlos exclusivamente para los fines autorizados por el titular. YoPago no se
              responsabiliza por el tratamiento indebido que realicen dichos terceros fuera del marco
              contractual establecido.
            </p>
            <p className="mt-2">
              YoPago se provee "tal cual" (as-is), sin garantías de disponibilidad continua ni ausencia
              de errores. No nos hacemos responsables por pérdidas económicas derivadas del uso o mal
              uso del servicio, errores en los datos ingresados por los usuarios, ni por transferencias
              realizadas a cuentas incorrectas. Durante el período de MVP el servicio puede presentar
              interrupciones o cambios sin previo aviso.
            </p>
          </section>

          <section>
            <h2>9. Modificaciones</h2>
            <p>
              YoPago se reserva el derecho de modificar estos términos en cualquier momento. Los cambios
              entrarán en vigencia al publicarse en esta página. El uso continuado del servicio implica
              la aceptación de los términos vigentes.
            </p>
          </section>

          <section>
            <h2>10. Ley aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de la República de Chile, en particular la Ley N°
              19.628 sobre protección de datos personales y la Ley N° 21.719. Cualquier disputa se
              someterá a los tribunales competentes de la ciudad de Santiago.
            </p>
          </section>

          <section>
            <h2>11. Contacto</h2>
            <p>
              Para consultas, solicitudes de eliminación de datos o cualquier otro asunto relacionado
              con estos términos, escríbenos a{" "}
              <a href="mailto:franbravobahamondes@gmail.com" className="underline underline-offset-2">
                franbravobahamondes@gmail.com
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
