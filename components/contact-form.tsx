"use client";

import { useState, type FormEvent } from "react";
import { siteConfig } from "@/lib/site-config";

export function ContactForm() {
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"error" | "success" | "">("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setFeedbackType("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!siteConfig.email) {
      setFeedback("The business email is not configured yet, so your message has not been sent. Please check back soon.");
      setFeedbackType("error");
      return;
    }
    const data = new FormData(form);
    const subject = encodeURIComponent(`Website enquiry from ${String(data.get("name"))}`);
    const body = encodeURIComponent(
      `Name: ${String(data.get("name"))}\nEmail: ${String(data.get("email"))}\nPhone: ${String(data.get("phone") || "Not provided")}\n\n${String(data.get("message"))}`,
    );
    window.location.href = `mailto:${encodeURIComponent(siteConfig.email)}?subject=${subject}&body=${body}`;
    setFeedback("Your email app should open with your message. This website does not store or submit it.");
    setFeedbackType("success");
    form.reset();
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="contact-name">Your name</label>
        <input autoComplete="name" id="contact-name" maxLength={100} name="name" required />
      </div>
      <div className="form-field">
        <label htmlFor="contact-email">Email address</label>
        <input autoComplete="email" id="contact-email" maxLength={254} name="email" required type="email" />
      </div>
      <div className="form-field">
        <label htmlFor="contact-phone">Phone number <span>(optional)</span></label>
        <input autoComplete="tel" id="contact-phone" maxLength={30} name="phone" type="tel" />
      </div>
      <div className="form-field">
        <label htmlFor="contact-message">How can we help?</label>
        <textarea id="contact-message" maxLength={3000} name="message" required rows={5} />
      </div>
      <button className="button button-primary" type="submit">Prepare your message <span aria-hidden="true">→</span></button>
      <p aria-live="polite" className={`form-feedback${feedbackType ? ` ${feedbackType}` : ""}`}>{feedback}</p>
      <p className="privacy-note">Your message is not stored on this website. Please avoid sharing sensitive personal information.</p>
    </form>
  );
}
