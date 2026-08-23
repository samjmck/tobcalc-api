import app from "./src/handlers.ts";

Deno.serve(app.fetch);
