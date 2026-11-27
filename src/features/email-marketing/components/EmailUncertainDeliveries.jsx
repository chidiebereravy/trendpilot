"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

import {
  getUncertainEmailDeliveries,
  resolveUncertainEmailDelivery,
} from "@/features/email-marketing/api/email-marketing.api";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    "The operation could not be completed. Please try again."
  );
}

export default function EmailUncertainDeliveries({ campaignId, onResolved }) {
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const deliveriesQuery = useQuery({
    queryKey: ["email-campaign-uncertain-deliveries", campaignId],
    queryFn: () => getUncertainEmailDeliveries(campaignId),
    staleTime: 0,
    retry: false,
  });

  const resolveMutation = useMutation({
    mutationFn: (payload) => resolveUncertainEmailDelivery(campaignId, payload),
    onSuccess: async () => {
      setSelectedDeliveryId(null);
      setResolutionNote("");
      setConfirmed(false);
      setActionError("");
      setActionMessage("Delivery resolved as failed.");

      await deliveriesQuery.refetch();
      await onResolved?.();
    },
    onError: (error) => {
      setActionError(errorMessage(error));
    },
  });

  const items = deliveriesQuery.data?.items ?? [];
  const selectedDelivery = items.find((item) => item.id === selectedDeliveryId);

  function openReview(deliveryId) {
    setSelectedDeliveryId(deliveryId);
    setResolutionNote("");
    setConfirmed(false);
    setActionError("");
    setActionMessage("");
  }

  function closeReview() {
    setSelectedDeliveryId(null);
    setResolutionNote("");
    setConfirmed(false);
    setActionError("");
  }

  function submitResolution(event) {
    event.preventDefault();

    if (!selectedDelivery) return;

    if (!confirmed) {
      setActionError(
        "Confirm that you checked Resend and it did not accept this email.",
      );
      return;
    }

    if (resolutionNote.trim().length < 10) {
      setActionError("Enter a resolution note of at least 10 characters.");
      return;
    }

    setActionError("");

    resolveMutation.mutate({
      deliveryId: selectedDelivery.id,
      resolutionNote: resolutionNote.trim(),
      confirmNotAccepted: true,
    });
  }

  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />

        <div>
          <h4 className="font-semibold text-[#14243d]">
            Uncertain email deliveries
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These emails have an unknown provider outcome. Check their delivery
            status in Resend before resolving anything. Do not mark an email as
            failed if Resend may have accepted it.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {deliveriesQuery.isLoading ? (
        <p className="mt-4 text-sm text-slate-500">
          Loading uncertain deliveries...
        </p>
      ) : deliveriesQuery.isError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-red-700">
            {errorMessage(deliveriesQuery.error)}
          </p>

          <button
            type="button"
            onClick={() => deliveriesQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 size={17} />
          No uncertain deliveries are awaiting review.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-600">
            {items.length} delivery{items.length === 1 ? "" : "ies"} awaiting
            review
          </p>

          {items.map((delivery) => (
            <div
              key={delivery.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold break-all text-[#14243d]">
                    {delivery.subscriber?.email || "Unknown recipient"}
                  </p>

                  {delivery.subscriber?.display_name && (
                    <p className="mt-1 text-xs text-slate-500">
                      {delivery.subscriber.display_name}
                    </p>
                  )}

                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <p>Attempts: {delivery.attempt_count}</p>
                    <p>
                      Provider message ID:{" "}
                      <span className="font-mono break-all">
                        {delivery.provider_message_id || "Not recorded"}
                      </span>
                    </p>
                    {delivery.failure_reason && (
                      <p className="break-words">
                        Reason: {delivery.failure_reason}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    selectedDeliveryId === delivery.id
                      ? closeReview()
                      : openReview(delivery.id)
                  }
                  className="shrink-0 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                >
                  {selectedDeliveryId === delivery.id
                    ? "Close review"
                    : "Review delivery"}
                </button>
              </div>

              {selectedDeliveryId === delivery.id && (
                <form
                  onSubmit={submitResolution}
                  className="mt-4 space-y-4 border-t border-slate-100 pt-4"
                >
                  <div>
                    <label
                      htmlFor={`resolution-note-${delivery.id}`}
                      className="mb-1.5 block text-xs font-semibold text-slate-600"
                    >
                      Resolution note
                    </label>

                    <textarea
                      id={`resolution-note-${delivery.id}`}
                      className={inputClass}
                      rows={3}
                      minLength={10}
                      maxLength={1000}
                      required
                      value={resolutionNote}
                      onChange={(event) =>
                        setResolutionNote(event.target.value)
                      }
                      placeholder="Explain how you verified that Resend did not accept this email..."
                    />
                  </div>

                  <label className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#14243d]"
                    />
                    <span>
                      I checked the Resend logs and confirmed that Resend did
                      not accept this email. I understand that marking it failed
                      may make it eligible for a later retry.
                    </span>
                  </label>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeReview}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={
                        resolveMutation.isPending ||
                        !confirmed ||
                        resolutionNote.trim().length < 10
                      }
                      className="rounded-lg bg-[#14243d] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resolveMutation.isPending
                        ? "Resolving..."
                        : "Confirm as failed"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
