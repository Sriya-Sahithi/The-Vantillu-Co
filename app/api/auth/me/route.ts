import { getUserFromRequest } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  if (!hasDatabase()) return { user: null };
  const user = await getUserFromRequest(req);
  return { user: user ? { email: user.email, isAdmin: user.isAdmin } : null };
});
