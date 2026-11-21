import type { Metadata } from "next";
import { Montserrat, IBM_Plex_Mono, Rosarivo } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });
const rosarivo = Rosarivo({ variable: "--font-rosarivo", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Impacto EIRA",
  description:
    "Consolida los Excel de cada coordinación de EIRA Movimiento Rosa en un informe de impacto, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const entorno = process.env.NOMBRE_ENTORNO ?? "En blanco";
  return (
    <html lang="es" className={`${montserrat.variable} ${plexMono.variable} ${rosarivo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <header className="no-imprimir" style={{ borderBottom: "var(--border)", background: "var(--papel)" }}>
          <div className="container flex items-center justify-between" style={{ minHeight: 56 }}>
            <Link href="/" className="no-underline" style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 19, letterSpacing: "-0.01em", fontSynthesis: "none" }}>
              EIRA · Impacto
            </Link>
            <span className="mono etiqueta" title="Entorno de demostración">{entorno}</span>
          </div>
        </header>
        <main className="container" style={{ paddingBlock: "var(--sp-10)" }}>{children}</main>
        <footer className="no-imprimir container" style={{ paddingBlock: "var(--sp-8)", borderTop: "var(--border)", marginTop: "var(--sp-12)" }}>
          <p className="etiqueta">Datos ficticios de demostración · EIRA Movimiento Rosa A.C.</p>
        </footer>
      </body>
    </html>
  );
}
