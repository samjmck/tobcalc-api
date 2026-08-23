import { Hono } from "hono";
import type { SecurityProvider } from "../securities/types.ts";

export function createSecurityHandler(
  app: Hono,
  securityProvider: SecurityProvider,
): void {
  app.get("/security/:isin", async (context) => {
    const { isin } = context.req.param();

    try {
      const security = await securityProvider.searchSecurity(isin);

      if (security === null) {
        return context.json(
          { error: `Security with ISIN ${isin} not found` },
          404,
        );
      }

      return context.json(security);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Unknown error occurred";
      return context.json(
        { error: `Failed to fetch security details: ${message}` },
        500,
      );
    }
  });
}
