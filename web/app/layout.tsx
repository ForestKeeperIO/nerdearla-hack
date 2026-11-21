import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Manrope, Montserrat, IBM_Plex_Mono, Rosarivo } from "next/font/google";
import "./globals.css";
import "./atlas.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavPrincipal } from "@/components/nav-principal";
import { AccionesTablero } from "@/components/acciones-tablero";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const rosarivo = Rosarivo({ variable: "--font-rosarivo", subsets: ["latin"], weight: "400" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Impacto EIRA",
  description:
    "Consolida los Excel de cada coordinación de EIRA Movimiento Rosa en un informe de impacto, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} ${plexMono.variable} ${rosarivo.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <header className="no-imprimir atlas-mastil">
            <div className="atlas-mastil-interior">
              <Link href="/" className="atlas-firma" aria-label="EIRA, inicio">EIRA</Link>
              <NavPrincipal />
              <Suspense fallback={null}><AccionesTablero /></Suspense>
            </div>
          </header>
          <main className="container contenido">{children}</main>
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
