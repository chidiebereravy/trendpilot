"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Send } from "lucide-react";

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

const fieldClass =
  "mt-2 w-full border border-[#e7e3db] bg-white px-4 py-3.5 text-sm text-[#14243d] outline-none transition placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10";

export default function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (status === "error") {
      setStatus("idle");
      setError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error?.message ||
            "We could not send your message. Please try again.",
        );
      }

      setForm(initialForm);
      setStatus("success");
    } catch (submissionError) {
      setError(
        submissionError.message || "Something went wrong. Please try again.",
      );
      setStatus("error");
    }
  }

  return (
    <div>
      {status === "success" && (
        <div
          role="status"
          className="mb-6 flex gap-3 border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
          <div>
            <p className="font-semibold">Message sent successfully.</p>
            <p className="mt-1">
              Thank you for contacting TrendPilot. Your message has been
              received.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot field: hidden from ordinary visitors. */}
        <div
          aria-hidden="true"
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="contact-name"
              className="text-xs font-bold text-[#14243d]"
            >
              Your name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your name"
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="text-xs font-bold text-[#14243d]"
            >
              Email address
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={254}
              value={form.email}
              onChange={handleChange}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="contact-subject"
            className="text-xs font-bold text-[#14243d]"
          >
            Subject
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            placeholder="What would you like to discuss?"
            required
            minLength={3}
            maxLength={120}
            value={form.subject}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="text-xs font-bold text-[#14243d]"
          >
            Your message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={7}
            placeholder="Write your message here..."
            required
            minLength={20}
            maxLength={5000}
            value={form.message}
            onChange={handleChange}
            className={`${fieldClass} max-h-36 min-h-36 resize-y`}
          />
          <p className="mt-2 text-right text-xs text-gray-400">
            {form.message.length}/5000 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#14243d] px-7 py-4 text-xs font-bold text-white transition hover:bg-[#243b5d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? (
            "Sending message..."
          ) : (
            <>
              Send message
              <Send size={15} />
            </>
          )}
        </button>

        <p className="text-xs leading-6 text-gray-500">
          Your information will only be used to respond to your enquiry.
        </p>
      </form>
    </div>
  );
}
