import { readFile } from "node:fs/promises";
import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { MATERIAL_IDS, type MaterialId } from "@/config/materials";
import { getSiteContent } from "@/features/content/data";

export const alt = "Refrigerated truck transport";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAND_COLORS: Record<MaterialId, string> = {
  FROZEN: "#1d5fd6",
  CHILLED: "#0ea5c9",
  AMBIENT: "#f28c28",
};

/**
 * The logo as a PNG data URL: the image renderer cannot read WebP. Cached so the image can
 * be prerendered rather than converted per request.
 */
async function logoDataUrl(): Promise<string> {
  "use cache";
  cacheLife("max");
  const webp = await readFile(new URL("../../public/brand/logo.webp", import.meta.url));
  const png = await sharp(webp).resize({ width: 840 }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export default async function OpengraphImage() {
  const [{ business, copy, bands }, logoSrc] = await Promise.all([getSiteContent(), logoDataUrl()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #ffffff 0%, #eef6fc 60%, #dcedf9 100%)",
          color: "#061a30",
        }}
      >
        <img src={logoSrc} alt="" width={420} height={Math.round(420 * (569 / 1600))} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: "#1273c4", textTransform: "uppercase" }}>
            {business.tagline}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              maxWidth: 1000,
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -2,
              color: "#0a2d57",
            }}
          >
            {copy.heroHeading.replace(/ (\d+(?:\.\d+)?) (kg|t|tonnes)/g, " $1 $2")}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40, fontSize: 26, color: "#2b4059" }}>
          {MATERIAL_IDS.map((id) => (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, background: BAND_COLORS[id] }} />
              {bands[id].label}
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", gap: 0, height: 6, width: 120, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ flex: 1, background: "#ff7a00" }} />
            <div style={{ flex: 1, background: "#ffffff" }} />
            <div style={{ flex: 1, background: "#0a7a35" }} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
