/**
 * Safe JSON body parser for Next.js API routes.
 * Catches malformed JSON and returns null instead of throwing.
 * Routes should check for null and return 400 Bad Request.
 */
export async function safeJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
