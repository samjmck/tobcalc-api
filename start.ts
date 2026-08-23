import app from "./src/handlers/index.ts";

Deno.serve(app.fetch);
