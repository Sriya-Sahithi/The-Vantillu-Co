import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout for your The Vantillu Co. order.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
