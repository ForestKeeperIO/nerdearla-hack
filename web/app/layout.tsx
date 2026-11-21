import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Montserrat, IBM_Plex_Mono, Rosarivo } from "next/font/google";
import "./globals.css";
import "./expediente.css";
import "./bento.css";
import "./atlas.css";
import "./demo.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavPrincipal } from "@/components/nav-principal";
import { DemoGuiado } from "@/components/demo-guiado";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const rosarivo = Rosarivo({ variable: "--font-rosarivo", subsets: ["latin"], weight: "400" });
const geist = Geist({ variable: "--font-eira-bento", subsets: ["latin"] });

const LEMA = "Convierte los registros dispersos de una organización social en un informe de impacto claro, confiable y listo para compartir.";

export const metadata: Metadata = {
  title: { default: "Informes que unen", template: "%s · Informes que unen" },
  description: LEMA,
  openGraph: { title: "Informes que unen", description: LEMA, siteName: "Informes que unen" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geist.variable} ${montserrat.variable} ${plexMono.variable} ${rosarivo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <header className="no-imprimir eira-cabecera">
            <div className="eira-mastil">
              <Link href="/" className="eira-firma" aria-label="Informes que unen, inicio">Informes que unen <span>para EIRA Movimiento Rosa A.C.</span></Link>
              <NavPrincipal />
            </div>
          </header>
          <main className="container contenido">{children}</main>
          <footer
            className="no-imprimir container"
            style={{ paddingBlock: "var(--sp-8)", borderTop: "var(--border)", marginTop: "var(--sp-12)" }}
          >
            <p className="etiqueta"><strong>Informes que unen.</strong> {LEMA}</p>
            <p className="etiqueta">Datos ficticios de demostración — EIRA Movimiento Rosa A.C.</p>
          </footer>
          <DemoGuiado />
        </TooltipProvider>
      </body>
    </html>
  );
}
