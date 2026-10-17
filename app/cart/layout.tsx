import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your enquiry basket",
  description: "Review the items you would like to ask The Vantillu Co. about. This is an enquiry only, not an order.",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
