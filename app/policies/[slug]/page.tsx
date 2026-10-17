import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const policies: Record<string, { title: string; description: string }> = {
  shipping: {
    title: "Shipping & delivery",
    description: "Delivery coverage, charges, dispatch estimates and delivery timings must be confirmed by the business before this draft is replaced with the final policy.",
  },
  returns: {
    title: "Returns, refunds & cancellations",
    description: "Please add the business’s verified cancellation, return, replacement and refund terms here before accepting commercial orders.",
  },
  privacy: {
    title: "Privacy",
    description: "This website stores the enquiry basket in your browser only. The contact form opens your email application when configured and does not submit information to a server. Add the final privacy notice and any third-party service details before launch.",
  },
  terms: {
    title: "Terms of use",
    description: "Add the business’s reviewed terms, pricing conditions, product availability details and applicable business information before launch.",
  },
};

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug];
  return policy ? { title: policy.title, description: policy.description, alternates: { canonical: `/policies/${slug}` } } : { title: "Page not found" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  return (
    <div className="page-shell policy-page">
      <span className="eyebrow">Information for our customers</span>
      <h1>{policy.title}</h1>
      <p className="policy-draft">Draft — owner review required before launch</p>
      <p>{policy.description}</p>
      <Link className="text-link" href="/contact">Questions? Get in touch <span aria-hidden="true">→</span></Link>
    </div>
  );
}
