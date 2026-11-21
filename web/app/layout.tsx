import type { Metadata } from "next";
import Link from "next/link";
import { Montserrat, IBM_Plex_Mono, Rosarivo } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavPrincipal } from "@/components/nav-principal";
import { estadoRecorrido } from "@/lib/informe";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const rosarivo = Rosarivo({ variable: "--font-rosarivo", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Impacto EIRA",
  description:
    "Consolida los Excel de cada coordinación de EIRA Movimiento Rosa en un informe de impacto, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const entorno = process.env.NOMBRE_ENTORNO ?? "En blanco";
  // El botón primario del encabezado lleva al primer informe de programa.
  const primerPrograma = (await estadoRecorrido('tamizaje-rosa')).alcance;
  return (
    <html lang="es" className={`${montserrat.variable} ${plexMono.variable} ${rosarivo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <header
            className="no-imprimir sticky top-0 z-20"
            style={{
              borderBottom: "var(--border)",
              background: "color-mix(in oklab, var(--papel) 92%, transparent)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div className="container flex items-center gap-4" style={{ minHeight: 52 }}>
              <Link
                href="/"
                className="no-underline"
                style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--tinta)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
              >
                EIRA Impacto
              </Link>
              <NavPrincipal />
              <span className="mono etiqueta ml-auto hidden sm:inline" title="Entorno de demostración">
                {entorno}
              </span>
              <Link href={`/informe/${primerPrograma}/subir`} className="btn btn--primario btn--sm no-underline">
                Subir archivos
              </Link>
            </div>
          </header>
          <main className="container flex-1" style={{ paddingBlock: "var(--sp-10)" }}>{children}</main>
          <footer
            className="no-imprimir container"
            style={{ paddingBlock: "var(--sp-8)", borderTop: "var(--border)", marginTop: "var(--sp-12)" }}
          >
            <p className="etiqueta">Datos ficticios de demostración — EIRA Movimiento Rosa A.C.</p>
          </footer>
        </TooltipProvider>
      </body>
    </html>
  );
}
