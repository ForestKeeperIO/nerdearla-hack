import type { Metadata } from "next";
import { Montserrat, IBM_Plex_Mono, Rosarivo } from "next/font/google";
import "./globals.css";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";

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
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <header
                className="no-imprimir sticky top-0 z-20 flex items-center gap-3 px-4"
                style={{
                  minHeight: 52,
                  borderBottom: "var(--border)",
                  background: "color-mix(in oklab, var(--papel) 92%, transparent)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <SidebarTrigger aria-label="Abrir o cerrar el menú" />
                <Separator orientation="vertical" style={{ height: 20 }} />
                <span
                  className="mono"
                  style={{ fontSize: "var(--fs-meta)", color: "var(--tinta-tenue)", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Consolidación de impacto
                </span>
                <span className="mono etiqueta ml-auto" title="Entorno de demostración">
                  {entorno}
                </span>
              </header>
              <main className="container flex-1" style={{ paddingBlock: "var(--sp-10)" }}>{children}</main>
              <footer
                className="no-imprimir container"
                style={{ paddingBlock: "var(--sp-8)", borderTop: "var(--border)", marginTop: "var(--sp-12)" }}
              >
                <p className="etiqueta">Datos ficticios de demostración · EIRA Movimiento Rosa A.C.</p>
              </footer>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
