import { createClientServices } from "../application/client/services";
import { browserKeyValueStore } from "../infrastructure/client/browser-key-value-store";
import { httpSessionGateway } from "../infrastructure/client/http-session-gateway";

/** Client composition root: the browser adapters behind the application services. */
export const clientServices = createClientServices(browserKeyValueStore, httpSessionGateway);
