import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = "The Vantillu Co. — The Modern Millennial Kitchen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "86px",
          background: "#f4efe5",
          color: "#3c2a21",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ color: "#6b7a4a", fontSize: 20, letterSpacing: "0.16em", textTransform: "uppercase" }}>
          {siteConfig.tagline}
        </div>
        <div style={{ marginTop: 28, fontSize: 78, lineHeight: 1.08, maxWidth: 980 }}>
          The Vantillu Co.
        </div>
        <div style={{ marginTop: 24, color: "#786c60", fontFamily: "Arial, sans-serif", fontSize: 24 }}>
          Traditional homemade goodness. Made fresh in Hyderabad.
        </div>
        <div style={{ width: 112, height: 5, marginTop: 42, background: "#c45c32" }} />
      </div>
    ),
    size,
  );
}
