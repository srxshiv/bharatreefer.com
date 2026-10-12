import { getFleetPhotoFile } from "@/features/content/data";

/** Serves a fleet photo. Photos never change in place (a replacement gets a new id), so they cache for a year. */
export async function GET(_request: Request, { params }: RouteContext<"/media/fleet/[id]">) {
  const { id } = await params;
  const file = await getFleetPhotoFile(id);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
