import type { Metadata } from "next";

export const metadata: Metadata = { title: "Find your order", robots: { index: false, follow: true } };

export default function TrackLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
