// Lets Node's built-in test runner load the TypeScript sources directly: registers a resolver
// that adds the ".ts" extension the sources leave out in their relative imports.
import { register } from "node:module";

register("./resolve-ts.mjs", import.meta.url);
