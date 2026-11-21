import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { PasosCabecera } from "@/components/pasos";
import { cambiarRol } from "@/lib/acciones";
import { rolActual } from "@/lib/rol";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Impacto EIRA",
  description:
    "Consolida los Excel de cada coordinación de EIRA Movimiento Rosa en un informe de impacto, sin contar dos veces el mismo archivo, la misma fila ni la misma persona.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const rol = await rolActual();
  return (
    <html
      lang="es"
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="no-imprimir sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
              <SidebarTrigger aria-label="Mostrar u ocultar el menú" />
              <Separator orientation="vertical" className="h-6!" />
              <PasosCabecera />
              <form className="ml-auto flex items-center gap-2">
                <span className="etiqueta hidden md:inline">Rol (simulado):</span>
                <Button
                  type="submit"
                  size="sm"
                  variant={rol === 'coordinacion' ? 'default' : 'outline'}
                  formAction={cambiarRol.bind(null, 'coordinacion')}
                  aria-pressed={rol === 'coordinacion'}
                >
                  Coordinación
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant={rol === 'presidencia' ? 'default' : 'outline'}
                  formAction={cambiarRol.bind(null, 'presidencia')}
                  aria-pressed={rol === 'presidencia'}
                >
                  Presidencia
                </Button>
              </form>
            </header>
            <main className="container flex-1 py-6">{children}</main>
            <footer className="no-imprimir border-t border-border py-4">
              <div className="container etiqueta">
                Datos ficticios de demostración. Los cálculos se hacen en Valkey, en el servidor; el navegador nunca habla con Valkey.
              </div>
            </footer>
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
