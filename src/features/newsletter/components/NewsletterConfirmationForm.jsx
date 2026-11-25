"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

export default function NewsletterConfirmationForm({ token }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!token || status === "loading" || status === "success") {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/newsletter/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.error?.message ||
            "We could not confirm your subscription. Please try again.",
        );
      }

      setStatus("success");
    } catch (confirmationError) {
      setError(
        confirmationError.message || "Something went wrong. Please try again.",
      );
      setStatus("error");
    }
  }

  if (!token) {
    return (
      <div
        role="alert"
        className="border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700"
      >
        <ShieldAlert className="mx-auto mb-3" size={24} />
        <p className="font-semibold">Confirmation link missing</p>
        <p className="mt-2 leading-6">
          This page does not contain a valid confirmation link. Please use the
          link in your newsletter confirmation email.
        </p>
        <Link
          href="/newsletter"
          className="mt-4 inline-flex font-bold text-[#14243d] underline underline-offset-4"
        >
          Return to newsletter signup
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="border border-green-200 bg-green-50 p-6 text-center text-green-800"
      >
        <CheckCircle2 className="mx-auto mb-3" size={30} />
        <h2 className="text-lg font-bold">You&apos;re subscribed!</h2>
        <p className="mt-2 text-sm leading-7">
          Your email address has been confirmed. Welcome to the TrendPilot
          community. We&apos;re glad to have you with us.
        </p>
        <Link
          href="/articles"
          className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[#14243d] transition hover:text-[#a78348]"
        >
          Explore our articles
          <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {status === "error" && (
        <div
          role="alert"
          className="mb-5 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center gap-3 bg-[#14243d] px-7 py-4 text-xs font-bold text-white transition hover:bg-[#243b5d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? (
          "Confirming your subscription..."
        ) : (
          <>
            Confirm subscription
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p className="mt-4 text-center text-xs leading-6 text-gray-500">
        By confirming, you activate your email newsletter subscription. You can
        unsubscribe at any time.
      </p>
    </div>
  );
}
