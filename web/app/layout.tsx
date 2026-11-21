import type { Metadata } from "next";
import Link from "next/link";
import { Montserrat, IBM_Plex_Mono, Rosarivo } from "next/font/google";
import "./globals.css";
import "./expediente.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavPrincipal } from "@/components/nav-principal";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const rosarivo = Rosarivo({ variable: "--font-rosarivo", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Impacto EIRA",
  description:
    "Consolida los Excel de cada coordinación de EIRA Movimiento Rosa en un informe de impacto, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const entorno = process.env.NOMBRE_ENTORNO ?? "Demostración";
  return (
    <html lang="es" className={`${montserrat.variable} ${plexMono.variable} ${rosarivo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider>
          <header className="no-imprimir eira-cabecera">
            <div className="eira-mastil">
              <Link
                href="/"
                className="eira-firma"
              >
                EIRA <span>Movimiento Rosa A.C.</span>
              </Link>
              <NavPrincipal />
              <span className="eira-entorno">
                {entorno}
              </span>
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
