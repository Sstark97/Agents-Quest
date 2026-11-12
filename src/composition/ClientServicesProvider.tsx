"use client";
import type { ReactNode } from "react";
import { ServicesProvider } from "@/src/ui/services-context";
import { clientServices } from "./client";

/** Wires the browser adapters into the interface. Rendered once, at the root layout. */
export function ClientServicesProvider({ children }: { children: ReactNode }) {
  return <ServicesProvider services={clientServices}>{children}</ServicesProvider>;
}
