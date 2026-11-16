import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function OrderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
