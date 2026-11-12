"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { ClientServices } from "@/src/application/client/services";

const ServicesContext = createContext<ClientServices | null>(null);

/** Makes the application services available to every component below. */
export function ServicesProvider({ services, children }: { services: ClientServices; children: ReactNode }) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): ClientServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("useServices must be used inside a ServicesProvider");
  return services;
}
