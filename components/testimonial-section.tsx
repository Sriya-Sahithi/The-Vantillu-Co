type Testimonial = { quote: string; name: string };

const testimonials: Testimonial[] = [];

export function TestimonialSection() {
  if (testimonials.length === 0) return null;

  return (
    <section aria-label="Customer notes" className="testimonial-section">
      <span className="eyebrow">Kind words from our customers</span>
      <div className="testimonial-list">
        {testimonials.map((testimonial) => (
          <figure key={`${testimonial.name}-${testimonial.quote}`}>
            <blockquote>“{testimonial.quote}”</blockquote>
            <figcaption>{testimonial.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
