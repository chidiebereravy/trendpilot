"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

const initialForm = {
  name: "",
  email: "",
  consent: false,
  website: "",
};

const fieldClass =
  "mt-2 w-full border border-[#e7e3db] bg-white px-4 py-3.5 text-sm text-[#14243d] outline-none transition placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10";

export default function NewsletterSignupForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
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
      const response = await fetch("/api/newsletter/signup", {
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
            "We could not process your subscription. Please try again.",
        );
      }

      setForm(initialForm);
      setStatus("success");
    } catch (submissionError) {
      setError(
        submissionError.message ||
          "Something went wrong. Please try again.",
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
          <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold">Check your inbox.</p>
            <p className="mt-1 leading-6">
              If your address is eligible, you&apos;ll receive an email with
              instructions to confirm your subscription.
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
        <div
          aria-hidden="true"
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
        >
          <label htmlFor="newsletter-website">Website</label>
          <input
            id="newsletter-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={handleChange}
          />
        </div>

        <div>
          <label
            htmlFor="newsletter-name"
            className="text-xs font-bold text-[#14243d]"
          >
            Your name <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="newsletter-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your name"
            maxLength={80}
            value={form.name}
            onChange={handleChange}
            className={fieldClass}
          />
        </div>

        <div>
          <label
            htmlFor="newsletter-email"
            className="text-xs font-bold text-[#14243d]"
          >
            Email address
          </label>
          <input
            id="newsletter-email"
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

        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600">
          <input
            name="consent"
            type="checkbox"
            required
            checked={form.consent}
            onChange={handleChange}
            className="mt-1 h-4 w-4 shrink-0 accent-[#a78348]"
          />
          <span>
            I agree to receive email newsletters from TrendPilot. I understand
            that I can unsubscribe at any time.
          </span>
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex w-full items-center justify-center gap-3 bg-[#14243d] px-7 py-4 text-xs font-bold text-white transition hover:bg-[#243b5d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? (
            "Processing..."
          ) : (
            <>
              Subscribe to the newsletter
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-xs leading-6 text-gray-500">
          We&apos;ll send you a confirmation email first. Your subscription
          won&apos;t become active until you confirm your email address.
        </p>
      </form>
    </div>
  );
}
