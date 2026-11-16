import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your The Vantillu Co. cart.",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
