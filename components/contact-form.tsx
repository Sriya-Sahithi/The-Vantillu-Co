"use client";

import { useState, type FormEvent } from "react";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export function ContactForm() {
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState<"error" | "success" | "">("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setFeedbackType("");
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get("name"));
    const phone = String(data.get("phone") || "Not provided");
    const note = String(data.get("message"));
    const whatsappUrl = getWhatsAppUrl(
      `Hello! I’m ${name}.\nPhone: ${phone}\n\n${note}`,
    );
    if (!whatsappUrl) {
      setFeedback("WhatsApp is not configured yet, so your message has not been sent.");
      setFeedbackType("error");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setFeedback("WhatsApp should open with your message. This website does not store it.");
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
        <label htmlFor="contact-phone">Phone number <span>(optional)</span></label>
        <input autoComplete="tel" id="contact-phone" maxLength={30} name="phone" type="tel" />
      </div>
      <div className="form-field">
        <label htmlFor="contact-message">How can we help?</label>
        <textarea id="contact-message" maxLength={3000} name="message" required rows={5} />
      </div>
      <button className="button button-primary" type="submit">Continue on WhatsApp <span aria-hidden="true">→</span></button>
      <p aria-live="polite" className={`form-feedback${feedbackType ? ` ${feedbackType}` : ""}`}>{feedback}</p>
      <p className="privacy-note">Your note opens WhatsApp at {siteConfig.whatsappDisplay}. It is not stored on this website. Please avoid sharing sensitive personal information.</p>
    </form>
  );
}
