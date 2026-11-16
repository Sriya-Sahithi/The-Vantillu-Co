import { storeProductImage } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { badRequest, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(async (req) => {
  await requireAdmin(req);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw badRequest("Choose an image to upload.");
  return { url: await storeProductImage(Buffer.from(await file.arrayBuffer())) };
});
