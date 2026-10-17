import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = "The Vantillu Co. — From our vantillu to yours";
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
          color: "#30241e",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ color: "#a43e2d", fontSize: 22, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          {siteConfig.name}
        </div>
        <div style={{ marginTop: 30, fontSize: 82, lineHeight: 1.08, maxWidth: 950 }}>
          From our vantillu to yours.
        </div>
        <div style={{ marginTop: 30, color: "#786c60", fontFamily: "Arial, sans-serif", fontSize: 24 }}>
          A little taste of a home kitchen.
        </div>
        <div style={{ width: 112, height: 5, marginTop: 42, background: "#d9a642" }} />
      </div>
    ),
    size,
  );
}
