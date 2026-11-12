import "@fontsource/press-start-2p/400.css";
import "@fontsource/vt323/400.css";
import "./globals.css";
import type { ReactNode } from "react";
import { ClientServicesProvider } from "@/src/composition/ClientServicesProvider";
import { spriteVars } from "@/src/ui/art/sprites";
import { AppChrome } from "@/src/ui/components/AppChrome";
import { SiteFooter } from "@/src/ui/components/SiteFooter";

export const metadata = { title: "Agent Quest", description: "Agent Quest: niveles para practicar los conceptos del día 1" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={spriteVars}>
        <ClientServicesProvider>
          <main>{children}</main>
          <SiteFooter />
          <AppChrome />
        </ClientServicesProvider>
      </body>
    </html>
  );
}
