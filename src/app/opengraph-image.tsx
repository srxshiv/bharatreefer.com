import { ImageResponse } from "next/og";
import { FLEET_CAPACITIES_KG } from "@/config/fleet";
import { MATERIAL_LIST } from "@/config/materials";
import { site } from "@/config/site";

export const alt = `${site.name}: refrigerated truck transport`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAND_COLORS = { FROZEN: "#5b7cff", CHILLED: "#3cc6ec", AMBIENT: "#f0a52b" } as const;
const LARGEST_TONNES = FLEET_CAPACITIES_KG[FLEET_CAPACITIES_KG.length - 1] / 1000;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#06131b",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34, fontWeight: 700 }}>
          {site.name}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#3cc6ec" }}>
            {site.tagline.toUpperCase()}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              maxWidth: 900,
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {`Reefer trucks from ${FLEET_CAPACITIES_KG[0]}\u00a0kg to ${LARGEST_TONNES}\u00a0tonnes.`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 30, color: "#b4c5ce" }}>
          {MATERIAL_LIST.map((band) => (
            <div key={band.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: BAND_COLORS[band.id],
                }}
              />
              {band.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
