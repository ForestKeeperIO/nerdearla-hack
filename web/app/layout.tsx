import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavPasos } from "@/components/cabecera";
import { cambiarRol } from "@/lib/acciones";
import { rolActual } from "@/lib/rol";
import { Button } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="no-imprimir border-b border-[var(--color-rule)] bg-[var(--color-cotton)]">
          <div className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="font-semibold tracking-tight">
                Impacto <span className="text-[var(--color-accent-2)]">EIRA</span>
              </span>
              <NavPasos />
            </div>
            <form className="flex items-center gap-2">
              <span className="etiqueta">Rol (simulado):</span>
              <Button
                type="submit"
                variant={rol === 'coordinacion' ? 'default' : 'outline'}
                formAction={cambiarRol.bind(null, 'coordinacion')}
                aria-pressed={rol === 'coordinacion'}
              >
                Coordinación
              </Button>
              <Button
                type="submit"
                variant={rol === 'presidencia' ? 'default' : 'outline'}
                formAction={cambiarRol.bind(null, 'presidencia')}
                aria-pressed={rol === 'presidencia'}
              >
                Presidencia
              </Button>
            </form>
          </div>
        </header>
        <main className="container flex-1 py-6">{children}</main>
        <footer className="no-imprimir border-t border-[var(--color-rule)] py-4">
          <div className="container etiqueta">
            Datos ficticios de demostración. Los cálculos se hacen en Valkey, en el servidor; el navegador nunca habla con Valkey.
          </div>
        </footer>
      </body>
    </html>
  );
}
