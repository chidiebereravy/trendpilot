"use client";

import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Link2,
  LoaderCircle,
  Pause,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useMedia } from "@/features/media/hooks/useMedia";

import {
  useAffiliateLinks,
  useAffiliateLinkStats,
  useAffiliatePrograms,
  useCreateAffiliateLink,
  useCreateAffiliateProgram,
  useUpdateAffiliateLink,
  useUpdateAffiliateProgram,
} from "@/features/affiliate/queries/affiliate.queries";
import Image from "next/image";

const PAGE_SIZE = 20;

const LINK_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "active",
  "paused",
  "expired",
  "archived",
];

const PROGRAM_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "paused",
  "archived",
];

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-50 text-amber-800",
  approved: "bg-blue-50 text-blue-800",
  active: "bg-emerald-50 text-emerald-800",
  paused: "bg-orange-50 text-orange-800",
  expired: "bg-rose-50 text-rose-800",
  archived: "bg-slate-200 text-slate-600",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#14243d] outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function humanize(value) {
  return (value || "").replaceAll("_", " ");
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
        STATUS_STYLES[status] || STATUS_STYLES.draft
      }`}
    >
      {humanize(status)}
    </span>
  );
}

function MetricCard({ label, value, detail, icon: Icon, accent = "gold" }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#14243d]">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            accent === "navy"
              ? "bg-[#14243d]/[0.06] text-[#14243d]"
              : "bg-[#c4a16a]/15 text-[#a17b43]"
          }`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>
    </article>
  );
}

function Modal({ title, description, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0b1728]/55 p-3 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto w-full ${
          wide ? "max-w-7xl" : "max-w-2xl"
        } rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-[#14243d]">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </header>

        <div className="p-4 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      {children}
      {hint && (
        <span className="block text-xs leading-5 text-slate-500">{hint}</span>
      )}
    </label>
  );
}

function ActionButton({ children, onClick, disabled, variant = "secondary" }) {
  const styles =
    variant === "primary"
      ? "bg-[#14243d] text-white hover:bg-[#203858]"
      : variant === "danger"
        ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

function LinkForm({
  initial,
  programs,
  isAdmin,
  onSubmit,
  onCancel,
  isSaving,
  error,
}) {
  const [form, setForm] = useState(() => ({
    programId: initial?.program_id || "",
    title: initial?.title || "",
    description: initial?.description || "",
    destinationUrl: initial?.destination_url || "",
    expiresAt: initial?.expires_at
      ? new Date(initial.expires_at).toISOString().slice(0, 16)
      : "",
    status: initial?.status || "draft",
  }));

  const [validationError, setValidationError] = useState("");

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    setValidationError("");

    if (!form.programId) {
      setValidationError("Select an affiliate program.");
      return;
    }

    if (!form.title.trim() || form.title.trim().length < 2) {
      setValidationError("The title must contain at least two characters.");
      return;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(form.destinationUrl.trim());
    } catch {
      setValidationError("Enter a valid destination URL.");
      return;
    }

    if (parsedUrl.protocol !== "https:") {
      setValidationError("Only HTTPS destinations are allowed.");
      return;
    }

    let expiresAt = null;

    if (form.expiresAt) {
      const date = new Date(form.expiresAt);

      if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
        setValidationError("Expiry must be a future date and time.");
        return;
      }

      expiresAt = date.toISOString();
    }

    const payload = {
      programId: form.programId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      destinationUrl: parsedUrl.toString(),
      expiresAt,
    };

    if (initial) {
      onSubmit(payload);
    } else {
      payload.status = form.status;
      onSubmit(payload);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Affiliate program" required>
        <select
          className={inputClass}
          value={form.programId}
          onChange={(event) => change("programId", event.target.value)}
          required
        >
          <option value="">Select a program</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name} ({humanize(program.status)})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Link title" required>
        <input
          className={inputClass}
          value={form.title}
          onChange={(event) => change("title", event.target.value)}
          maxLength={250}
          minLength={2}
          required
          placeholder="e.g. Recommended project management tool"
        />
      </Field>

      <Field
        label="Destination URL"
        required
        hint="HTTPS links only. This destination is stored centrally, not in article content."
      >
        <input
          className={inputClass}
          type="url"
          value={form.destinationUrl}
          onChange={(event) => change("destinationUrl", event.target.value)}
          required
          placeholder="https://example.com/product"
        />
      </Field>

      <Field
        label="Description"
        hint="Optional internal context or recommendation summary. Maximum 2,000 characters."
      >
        <textarea
          className={`${inputClass} min-h-24 resize-y`}
          value={form.description}
          onChange={(event) => change("description", event.target.value)}
          maxLength={2000}
          placeholder="Describe the product or service..."
        />
      </Field>

      <Field
        label="Expiry date and time"
        hint="Optional. Leave empty for no scheduled expiry."
      >
        <input
          className={inputClass}
          type="datetime-local"
          value={form.expiresAt}
          onChange={(event) => change("expiresAt", event.target.value)}
        />
      </Field>

      {!initial && (
        <Field label="Initial status">
          <select
            className={inputClass}
            value={form.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="pending_review">Submit for review</option>
          </select>
        </Field>
      )}

      {(validationError || error) && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {validationError || getErrorMessage(error)}
        </div>
      )}

      <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        <ActionButton onClick={onCancel} disabled={isSaving}>
          Cancel
        </ActionButton>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#203858] disabled:opacity-50"
        >
          {isSaving && <LoaderCircle size={15} className="animate-spin" />}
          {initial ? "Save changes" : "Create affiliate link"}
        </button>
      </div>
    </form>
  );
}

function ProgramForm({ initial, onSubmit, onCancel, isSaving, error }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    slug: initial?.slug || "",
    program_type: initial?.program_type || "affiliate_network",
    network_name: initial?.network_name || "",
    website_url: initial?.website_url || "",
    terms_url: initial?.terms_url || "",
    commission_model: initial?.commission_model || "unknown",
    default_currency: initial?.default_currency || "USD",
    status: initial?.status || "draft",
    notes: initial?.notes || "",
    description: initial?.description || "",
    commission_details: initial?.commission_details || "",
    eligibility_details: initial?.eligibility_details || "",
    cover_image_id: initial?.cover_image_id || "",
  }));

  const [validationError, setValidationError] = useState("");
  const [mediaPage, setMediaPage] = useState(1);

  const {
    data: mediaData,
    isLoading: isLoadingMedia,
    isError: isMediaError,
  } = useMedia({
    purpose: "affiliate",
    status: "published",
    page: mediaPage,
    pageSize: 20,
  });

  const mediaItems = mediaData?.items || [];
  const mediaPagination = mediaData?.pagination;

  const selectedCoverImage =
    mediaItems.find((asset) => asset.id === form.cover_image_id) ||
    (initial?.cover_image?.id === form.cover_image_id
      ? initial.cover_image
      : null);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    setValidationError("");

    if (form.name.trim().length < 2) {
      setValidationError("Campaign title must contain at least 2 characters.");
      return;
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug.trim())) {
      setValidationError("Use a lowercase slug with hyphens between words.");
      return;
    }

    for (const field of ["website_url", "terms_url"]) {
      const value = form[field].trim();

      if (!value) continue;

      try {
        if (new URL(value).protocol !== "https:") {
          throw new Error();
        }
      } catch {
        setValidationError(
          `${field === "website_url" ? "Website" : "Terms"} URL must be a valid HTTPS URL.`,
        );
        return;
      }
    }

    if (!/^[A-Z]{3}$/.test(form.default_currency)) {
      setValidationError("Currency must be a three-letter uppercase code.");
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      network_name: form.network_name.trim() || null,
      website_url: form.website_url.trim() || null,
      terms_url: form.terms_url.trim() || null,
      notes: form.notes.trim() || null,
      description: form.description.trim() || null,
      commission_details: form.commission_details.trim() || null,
      eligibility_details: form.eligibility_details.trim() || null,
      cover_image_id: form.cover_image_id || null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Campaign information
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Introduce the affiliate offer and explain why publishers should
                promote it.
              </p>
            </div>

            <Field label="Campaign title" required>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
                minLength={2}
                maxLength={200}
                placeholder="e.g. Premium Partner Program"
                required
              />
            </Field>

            <Field
              label="URL slug"
              required
              hint="Lowercase letters, numbers and hyphens."
            >
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => change("slug", e.target.value)}
                maxLength={200}
                placeholder="premium-partner-program"
                required
              />
            </Field>

            <Field
              label="Promotional description"
              hint="Explain the product, service, and benefits to potential affiliates."
            >
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
                maxLength={5000}
                placeholder="Tell publishers what makes this campaign worth promoting..."
              />
            </Field>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Campaign cover image
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a published affiliate image from your Media Library. Only
                affiliate campaign images are shown here.
              </p>
            </div>

            {selectedCoverImage?.preview_url ? (
              <div className="relative aspect-[16/7] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <Image
                  src={selectedCoverImage.preview_url}
                  alt={
                    selectedCoverImage.alt_text ||
                    selectedCoverImage.original_filename ||
                    form.name ||
                    "Campaign cover"
                  }
                  fill
                  unoptimized
                  sizes="(max-width: 1280px) 100vw, 600px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => change("cover_image_id", "")}
                  className="absolute top-3 right-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow hover:bg-white"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <div className="flex aspect-[16/7] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                <div>
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                    <Plus size={20} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No campaign cover selected
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose an image below to make your campaign stand out.
                  </p>
                </div>
              </div>
            )}

            {isLoadingMedia ? (
              <div className="rounded-xl border border-slate-200 p-5 text-sm text-slate-500">
                Loading affiliate images...
              </div>
            ) : isMediaError ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              >
                Unable to load affiliate images. Please try again later.
              </div>
            ) : mediaItems.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-700">
                  No published affiliate images available.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Upload an image with the Affiliate campaign purpose in Media
                  Library, then publish it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {mediaItems.map((asset) => {
                    const isSelected = form.cover_image_id === asset.id;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => change("cover_image_id", asset.id)}
                        aria-pressed={isSelected}
                        className={`group overflow-hidden rounded-xl border text-left transition ${
                          isSelected
                            ? "border-[#24466f] ring-2 ring-[#24466f]/20"
                            : "border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <div className="relative aspect-[4/3] bg-slate-100">
                          {asset.preview_url ? (
                            <Image
                              src={asset.preview_url}
                              alt={
                                asset.alt_text ||
                                asset.original_filename ||
                                "Affiliate image"
                              }
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 50vw, 200px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                              Preview unavailable
                            </div>
                          )}

                          {isSelected && (
                            <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#24466f] text-white">
                              <Check size={14} />
                            </div>
                          )}
                        </div>

                        <div className="p-2.5">
                          <p className="truncate text-xs font-medium text-slate-700">
                            {asset.original_filename}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {isSelected ? "Selected cover" : "Select image"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {mediaPagination?.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500">
                      Page {mediaPagination.page} of{" "}
                      {mediaPagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={mediaPage <= 1}
                        onClick={() =>
                          setMediaPage((current) => Math.max(1, current - 1))
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={mediaPage >= mediaPagination.totalPages}
                        onClick={() =>
                          setMediaPage((current) =>
                            Math.min(mediaPagination.totalPages, current + 1),
                          )
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Commission and eligibility
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Describe the offer in language publishers can understand.
              </p>
            </div>

            <Field
              label="Commission offer"
              hint='Examples: "Up to 30% commission" or "$15 per qualified signup".'
            >
              <input
                className={inputClass}
                value={form.commission_details}
                onChange={(e) => change("commission_details", e.target.value)}
                maxLength={500}
                placeholder="e.g. Up to 30% commission"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Commission model">
                <select
                  className={inputClass}
                  value={form.commission_model}
                  onChange={(e) => change("commission_model", e.target.value)}
                >
                  <option value="unknown">Unknown</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>

              <Field label="Default currency">
                <input
                  className={inputClass}
                  value={form.default_currency}
                  onChange={(e) =>
                    change("default_currency", e.target.value.toUpperCase())
                  }
                  maxLength={3}
                />
              </Field>
            </div>

            <Field
              label="Eligibility requirements"
              hint="Explain who can participate and any qualifying conditions."
            >
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.eligibility_details}
                onChange={(e) => change("eligibility_details", e.target.value)}
                maxLength={3000}
                placeholder="e.g. Open to approved publishers with relevant audiences..."
              />
            </Field>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Program details
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Program type" required>
                <select
                  className={inputClass}
                  value={form.program_type}
                  onChange={(e) => change("program_type", e.target.value)}
                >
                  <option value="affiliate_network">Affiliate network</option>
                  <option value="direct_merchant">Direct merchant</option>
                </select>
              </Field>

              <Field label="Network / provider name">
                <input
                  className={inputClass}
                  value={form.network_name}
                  onChange={(e) => change("network_name", e.target.value)}
                  maxLength={200}
                  placeholder="Provider name"
                />
              </Field>

              <Field label="Website URL">
                <input
                  className={inputClass}
                  type="url"
                  value={form.website_url}
                  onChange={(e) => change("website_url", e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Terms URL">
                <input
                  className={inputClass}
                  type="url"
                  value={form.terms_url}
                  onChange={(e) => change("terms_url", e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Campaign status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  {PROGRAM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanize(status)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Internal notes">
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
                maxLength={5000}
                placeholder="Notes for administrators..."
              />
            </Field>
          </section>
        </div>

        <aside className="min-w-0">
          <div className="space-y-4 xl:sticky xl:top-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Live campaign preview
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Preview how the campaign information comes together.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] bg-slate-100">
                {selectedCoverImage?.preview_url ? (
                  <Image
                    src={selectedCoverImage.preview_url}
                    alt={
                      selectedCoverImage.alt_text ||
                      selectedCoverImage.original_filename ||
                      "Campaign cover preview"
                    }
                    fill
                    unoptimized
                    sizes="(max-width: 1280px) 100vw, 400px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Campaign cover image
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                    {humanize(form.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Affiliate campaign
                  </p>
                  <h4 className="mt-2 text-xl font-bold text-slate-900">
                    {form.name.trim() || "Your campaign title"}
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    {form.network_name.trim() || "Program provider"}
                  </p>
                </div>

                <p className="text-sm leading-6 whitespace-pre-wrap text-slate-600">
                  {form.description.trim() ||
                    "Your promotional campaign description will appear here."}
                </p>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Commission offer
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#24466f]">
                    {form.commission_details.trim() ||
                      "Commission details to be announced"}
                  </p>
                </div>

                {form.eligibility_details.trim() && (
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                      Eligibility
                    </p>
                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                      {form.eligibility_details}
                    </p>
                  </div>
                )}

                {form.terms_url.trim() && (
                  <p className="truncate text-xs text-slate-500">
                    Terms: {form.terms_url}
                  </p>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    {humanize(form.program_type)} · {form.default_currency}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-400">
              This is an editor preview. The final campaign presentation depends
              on where the program is displayed.
            </p>
          </div>
        </aside>
      </div>

      {(validationError || error) && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {validationError || getErrorMessage(error)}
        </div>
      )}

      <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-5 sm:flex-row">
        <ActionButton onClick={onCancel} disabled={isSaving}>
          Cancel
        </ActionButton>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#203858] disabled:opacity-50"
        >
          {isSaving && <LoaderCircle size={15} className="animate-spin" />}
          {initial ? "Save campaign" : "Create campaign"}
        </button>
      </div>
    </form>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

export default function AffiliateLinksDashboard({ role }) {
  const isAdmin = role === "admin";

  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [programStatus, setProgramStatus] = useState("");
  const [programSearchInput, setProgramSearchInput] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState("");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter || undefined,
      programId: programFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, statusFilter, programFilter, page],
  );

  const programFilters = useMemo(
    () => ({
      search: programSearch || undefined,
      status: isAdmin ? programStatus || undefined : undefined,
      page: 1,
      pageSize: 50,
    }),
    [programSearch, programStatus, isAdmin],
  );

  const linksQuery = useAffiliateLinks(filters);
  const programsQuery = useAffiliatePrograms(programFilters);

  const statsQuery = useAffiliateLinkStats();

  const metrics = statsQuery.data?.stats ?? {
    draft: 0,
    pending_review: 0,
    approved: 0,
    active: 0,
    paused: 0,
    expired: 0,
    archived: 0,
  };

  const totalLinks = statsQuery.data?.total ?? 0;

  const performance = statsQuery.data?.performance ?? {
    period: "all_time",
    clicks: {
      total: 0,
      article: 0,
      other: 0,
    },
    conversions: {
      total: 0,
      pending: 0,
      confirmed: 0,
      rejected: 0,
      reversed: 0,
    },
    conversionRate: 0,
    commissions: [],
  };

  const createLink = useCreateAffiliateLink();
  const updateLink = useUpdateAffiliateLink();
  const createProgram = useCreateAffiliateProgram();
  const updateProgram = useUpdateAffiliateProgram();

  const links = linksQuery.data?.items || [];
  const pagination = linksQuery.data?.pagination;
  const programs = programsQuery.data?.items || [];

  const isSaving =
    createLink.isPending ||
    updateLink.isPending ||
    createProgram.isPending ||
    updateProgram.isPending;

  function showSuccess(message) {
    setNotice(message);
    setActionError("");
    setModal(null);
  }

  function showFailure(error) {
    setActionError(getErrorMessage(error));
  }

  async function saveLink(payload) {
    try {
      if (modal?.type === "edit-link") {
        await updateLink.mutateAsync({
          linkId: modal.item.id,
          payload,
        });
        showSuccess("Affiliate link updated successfully.");
      } else {
        await createLink.mutateAsync(payload);
        showSuccess("Affiliate link created successfully.");
      }
    } catch (error) {
      showFailure(error);
    }
  }

  async function saveProgram(payload) {
    try {
      if (modal?.type === "edit-program") {
        await updateProgram.mutateAsync({
          programId: modal.item.id,
          payload,
        });
        showSuccess("Affiliate program updated successfully.");
      } else {
        await createProgram.mutateAsync(payload);
        showSuccess("Affiliate program created successfully.");
      }
    } catch (error) {
      showFailure(error);
    }
  }

  async function changeLinkStatus(item, status) {
    const action = {
      pending_review: "submit this link for review",
      approved: "approve this link",
      active: "activate this link",
      paused: "pause this link",
      expired: "mark this link as expired",
      archived: "archive this link",
      draft: "return this link to draft",
    }[status];

    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    setActionError("");

    try {
      await updateLink.mutateAsync({
        linkId: item.id,
        payload: { status },
      });

      setNotice(`Link status changed to ${humanize(status)}.`);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatusFilter("");
    setProgramFilter("");
    setPage(1);
  }

  function startSearch(event) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function startProgramSearch(event) {
    event.preventDefault();
    setProgramSearch(programSearchInput.trim());
  }

  function linkActions(item) {
    const actions = [];

    if (
      item.status !== "archived" &&
      (isAdmin || ["draft", "pending_review"].includes(item.status))
    ) {
      actions.push(
        <button
          key="edit"
          type="button"
          onClick={() => {
            setActionError("");
            setModal({ type: "edit-link", item });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          <Pencil size={13} /> Edit
        </button>,
      );
    }

    if (isAdmin) {
      const transitions = {
        draft: ["pending_review", "archived"],
        pending_review: ["draft", "approved", "archived"],
        approved: ["active", "archived"],
        active: ["paused", "expired", "archived"],
        paused: ["active", "expired", "archived"],
        expired: ["archived"],
        archived: [],
      };

      for (const nextStatus of transitions[item.status] || []) {
        const labels = {
          pending_review: "Submit",
          approved: "Approve",
          active: "Activate",
          paused: "Pause",
          expired: "Expire",
          archived: "Archive",
          draft: "Return to draft",
        };

        const icons = {
          approved: Check,
          active: CheckCircle2,
          paused: Pause,
          archived: Archive,
          expired: Clock3,
        };

        const Icon = icons[nextStatus];

        actions.push(
          <button
            key={nextStatus}
            type="button"
            onClick={() => changeLinkStatus(item, nextStatus)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold ${
              nextStatus === "archived"
                ? "text-rose-700 hover:bg-rose-50"
                : "text-[#14243d] hover:bg-[#f5f1e9]"
            }`}
          >
            {Icon && <Icon size={13} />}
            {labels[nextStatus]}
          </button>,
        );
      }
    } else if (item.status === "draft") {
      actions.push(
        <button
          key="submit"
          type="button"
          onClick={() => changeLinkStatus(item, "pending_review")}
          className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#14243d] hover:bg-[#f5f1e9]"
        >
          Submit for review
        </button>,
      );
    }

    return actions;
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-7 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-8 text-slate-900 shadow-sm sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full border border-slate-200/70" />
        <div className="pointer-events-none absolute -top-8 -right-3 h-52 w-52 rounded-full border border-[#c4a16a]/25" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c4a16a]/30 bg-[#f5f1e9] px-3 py-1.5 text-xs font-medium text-[#8b6b3f]">
              <Link2 size={14} />
              Affiliate management workspace
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
              Affiliate Links
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Manage affiliate partnerships, centrally controlled recommendation
              links, approvals and link lifecycles from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                linksQuery.refetch();
                programsQuery.refetch();
                statsQuery.refetch();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-[#14243d] transition hover:bg-slate-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setActionError("");
                setModal({ type: "new-link" });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#14243d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203957]"
            >
              <Plus size={16} />
              New affiliate link
            </button>
          </div>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <nav
        aria-label="Affiliate workspace sections"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        {[
          { id: "overview", label: "Overview" },
          { id: "links", label: "Affiliate links" },
          { id: "programs", label: "Affiliate programs" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
              activeTab === tab.id
                ? "bg-[#14243d] text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <>
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#14243d]">
                Link performance workspace
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Live record counts returned by the affiliate links API.
              </p>
            </div>

            {statsQuery.isError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                Some status totals could not be loaded. Refresh the workspace to
                retry.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total links"
                  value={totalLinks}
                  detail="Across all lifecycle statuses"
                  icon={Link2}
                />
                <MetricCard
                  label="Active links"
                  value={metrics.active}
                  detail="Eligible for approved placements"
                  icon={CheckCircle2}
                  accent="navy"
                />
                <MetricCard
                  label="Awaiting approval"
                  value={metrics.pending_review}
                  detail="Pending administrator review"
                  icon={Clock3}
                />
                <MetricCard
                  label="Paused links"
                  value={metrics.paused}
                  detail="Temporarily inactive"
                  icon={Pause}
                />
              </div>
            )}
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#14243d]">
                Affiliate performance
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                All-time recorded clicks, conversions and commissions.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total clicks"
                value={formatNumber(performance.clicks.total)}
                detail={`${formatNumber(performance.clicks.article)} from article placements`}
                icon={Activity}
              />
              <MetricCard
                label="Confirmed conversions"
                value={formatNumber(performance.conversions.confirmed)}
                detail={`${formatNumber(performance.conversions.pending)} pending review`}
                icon={CheckCircle2}
                accent="navy"
              />
              <MetricCard
                label="Conversion rate"
                value={`${Number(performance.conversionRate).toFixed(2)}%`}
                detail="Confirmed conversions ÷ total clicks"
                icon={Link2}
              />
              <MetricCard
                label="Other clicks"
                value={formatNumber(performance.clicks.other)}
                detail="Clicks outside article placements"
                icon={ExternalLink}
              />
            </div>

            <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-[#14243d]">
                  Commission breakdown
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Recorded commission amounts grouped by currency and status.
                </p>
              </div>

              {performance.commissions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  No commission records have been recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500">
                        <th className="pb-3 font-medium">Currency</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 text-right font-medium">Records</th>
                        <th className="pb-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {performance.commissions.map((commission) => (
                        <tr key={`${commission.currency}-${commission.status}`}>
                          <td className="py-3 font-semibold text-[#14243d]">
                            {commission.currency}
                          </td>
                          <td className="py-3 text-slate-600 capitalize">
                            {humanize(commission.status)}
                          </td>
                          <td className="py-3 text-right text-slate-600 tabular-nums">
                            {formatNumber(commission.recordCount)}
                          </td>
                          <td className="py-3 text-right font-semibold text-[#14243d] tabular-nums">
                            {commission.currency}{" "}
                            {Number(commission.totalAmount).toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
                  <Activity size={19} />
                </span>
                <div>
                  <h2 className="font-semibold text-[#14243d]">
                    Link lifecycle
                  </h2>
                  <p className="text-xs text-slate-500">
                    Current records by status
                  </p>
                </div>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                {LINK_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                      setActiveTab("links");
                    }}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-3 text-sm text-slate-600 capitalize">
                      <StatusBadge status={status} />
                    </span>
                    <span className="text-sm font-semibold text-[#14243d] tabular-nums">
                      {formatNumber(metrics[status])}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <h2 className="font-semibold text-[#14243d]">
                    Workspace permissions
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your current access level
                  </p>
                </div>
              </div>
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-[#14243d] capitalize">
                  {role}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {isAdmin
                    ? "You can manage all affiliate links and programs, review submissions, approve links and control their lifecycle."
                    : "You can manage your own draft and pending-review links and select from active affiliate programs. Administrators control approvals and activation."}
                </p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" /> HTTPS
                  destinations enforced
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />{" "}
                  Centrally managed tracking codes
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />{" "}
                  Explicit approval and activation workflow
                </p>
              </div>
            </article>
          </section>
        </>
      )}

      {activeTab === "links" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.025)]">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-lg font-semibold text-[#14243d]">
                  Affiliate link records
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isAdmin
                    ? "All centrally managed affiliate links."
                    : "Only links created by your account."}
                  {pagination &&
                    ` ${formatNumber(pagination.total)} records found.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setModal({ type: "new-link" });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203858]"
              >
                <Plus size={16} /> Create link
              </button>
            </div>

            <form
              onSubmit={startSearch}
              className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_220px_auto_auto]"
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  className={`${inputClass} pl-9`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search titles and descriptions..."
                  maxLength={120}
                />
              </div>
              <select
                className={inputClass}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {LINK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={programFilter}
                onChange={(e) => {
                  setProgramFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All programs</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203858]"
              >
                Search
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </form>
          </div>

          {linksQuery.isLoading ? (
            <LoadingRows />
          ) : linksQuery.isError ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-rose-800">
                Unable to load affiliate links
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {getErrorMessage(linksQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => linksQuery.refetch()}
                className="mt-4 rounded-lg bg-[#14243d] px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : links.length === 0 ? (
            <div className="p-12 text-center">
              <Link2 size={28} className="mx-auto text-slate-300" />
              <h3 className="mt-3 font-semibold text-[#14243d]">
                No affiliate links found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Create a link or adjust your search and filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Affiliate link</th>
                      <th className="px-5 py-3">Program</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Created</th>
                      <th className="px-5 py-3">Tracking code</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {links.map((item) => (
                      <tr
                        key={item.id}
                        className="align-top hover:bg-slate-50/70"
                      >
                        <td className="max-w-[300px] px-5 py-4">
                          <p className="font-semibold text-[#14243d]">
                            {item.title}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {item.description || "No description"}
                          </p>
                          <a
                            href={item.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-[#9b7845] hover:underline"
                          >
                            <ExternalLink size={12} /> Destination
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {item.program?.name || "Unavailable"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400 capitalize">
                            {humanize(item.program?.program_type)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-4 text-xs whitespace-nowrap text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.tracking_code);
                              setNotice("Tracking code copied.");
                            }}
                            className="max-w-[150px] truncate rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[11px] text-slate-600 hover:bg-slate-200"
                            title="Copy tracking code"
                          >
                            {item.tracking_code}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex min-w-[140px] flex-wrap justify-end gap-1">
                            {linkActions(item)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Showing {formatNumber((page - 1) * PAGE_SIZE + 1)}–
                  {formatNumber(
                    Math.min(page * PAGE_SIZE, pagination?.total || 0),
                  )}{" "}
                  of {formatNumber(pagination?.total)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>
                  <span className="px-2 text-xs text-slate-500">
                    Page {page} of {Math.max(1, pagination?.totalPages || 1)}
                  </span>
                  <button
                    type="button"
                    disabled={!pagination?.hasMore}
                    onClick={() => setPage((current) => current + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      )}

      {activeTab === "programs" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-semibold text-[#14243d]">
                  Affiliate programs
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isAdmin
                    ? "Manage affiliate networks and direct merchant partnerships."
                    : "Active programs available for your affiliate links."}
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setModal({ type: "new-program" });
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#203858]"
                >
                  <Plus size={16} /> Add program
                </button>
              )}
            </div>

            <form
              onSubmit={startProgramSearch}
              className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
            >
              <input
                className={inputClass}
                value={programSearchInput}
                onChange={(e) => setProgramSearchInput(e.target.value)}
                placeholder="Search program names..."
                maxLength={100}
              />
              {isAdmin ? (
                <select
                  className={inputClass}
                  value={programStatus}
                  onChange={(e) => setProgramStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {PROGRAM_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {humanize(status)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="hidden sm:block" />
              )}
              <button
                type="submit"
                className="rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Search
              </button>
            </form>
          </div>

          {programsQuery.isLoading ? (
            <LoadingRows />
          ) : programsQuery.isError ? (
            <div className="p-8 text-center">
              <p className="font-semibold text-rose-800">
                Unable to load programs
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {getErrorMessage(programsQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => programsQuery.refetch()}
                className="mt-4 rounded-lg bg-[#14243d] px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : programs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-[#14243d]">No programs found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or add an affiliate program.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {programs.map((program) => (
                <article
                  key={program.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setModal({ type: "view-program", item: program })
                    }
                    className="block w-full text-left"
                    aria-label={`View ${program.name} campaign details`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                      {program.cover_image?.preview_url ? (
                        <Image
                          src={program.cover_image.preview_url}
                          alt={
                            program.cover_image.alt_text ||
                            program.cover_image.original_filename ||
                            program.name
                          }
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center">
                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                              <Link2 size={20} />
                            </div>
                            <p className="mt-2 text-xs font-medium text-slate-400">
                              No campaign cover
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="absolute top-3 right-3">
                        <StatusBadge status={program.status} />
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                          {humanize(program.program_type)}
                          {program.network_name
                            ? ` · ${program.network_name}`
                            : ""}
                        </p>

                        <h3 className="mt-1.5 line-clamp-2 text-lg font-bold text-[#14243d]">
                          {program.name}
                        </h3>
                      </div>

                      <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-500">
                        {program.description ||
                          "Explore this affiliate partnership and its available promotional opportunities."}
                      </p>

                      <div className="rounded-xl bg-slate-50 p-3.5">
                        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                          Commission offer
                        </p>
                        <p className="mt-1 text-base font-bold text-[#24466f]">
                          {program.commission_details ||
                            `Commission details unavailable · ${humanize(program.commission_model)}`}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-400">
                          {program.default_currency} ·{" "}
                          {humanize(program.program_type)}
                        </span>
                        <span className="text-xs font-semibold text-[#9b7845]">
                          View campaign{" "}
                          <ArrowRight size={13} className="ml-1 inline" />
                        </span>
                      </div>
                    </div>
                  </button>

                  {isAdmin && (
                    <div className="border-t border-slate-100 px-5 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError("");
                          setModal({ type: "edit-program", item: program });
                        }}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-[#24466f]"
                      >
                        <Pencil size={13} />
                        Edit campaign
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">
            {isAdmin
              ? "Program changes are restricted to administrators."
              : "Only active affiliate programs are visible to editors."}
          </div>
        </section>
      )}

      <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>TrendPilot Affiliate Management</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} /> Approval and lifecycle permissions are
          enforced by the API
        </span>
      </footer>

      {modal?.type === "new-link" && (
        <Modal
          title="Create affiliate link"
          description="Add a centrally managed destination that can later be used in approved article recommendation blocks."
          onClose={() => setModal(null)}
        >
          <LinkForm
            programs={programs.filter(
              (program) => program.status === "active" || isAdmin,
            )}
            isAdmin={isAdmin}
            onSubmit={saveLink}
            onCancel={() => setModal(null)}
            isSaving={isSaving}
            error={createLink.error}
          />
        </Modal>
      )}

      {modal?.type === "edit-link" && (
        <Modal
          title="Edit affiliate link"
          description="Update the centrally managed link details. Archived links cannot be edited."
          onClose={() => setModal(null)}
          wide
        >
          <LinkForm
            initial={modal.item}
            programs={programs.filter(
              (program) => program.status !== "archived",
            )}
            isAdmin={isAdmin}
            onSubmit={saveLink}
            onCancel={() => setModal(null)}
            isSaving={isSaving}
            error={updateLink.error}
          />
        </Modal>
      )}

      {isAdmin && modal?.type === "new-program" && (
        <Modal
          title="Add affiliate program"
          description="Register an affiliate network or direct merchant partnership."
          onClose={() => setModal(null)}
          wide
        >
          <ProgramForm
            onSubmit={saveProgram}
            onCancel={() => setModal(null)}
            isSaving={isSaving}
            error={createProgram.error}
          />
        </Modal>
      )}

      {modal?.type === "view-program" && (
        <Modal
          title={modal.item.name}
          description="Campaign overview, commission offer and partnership requirements."
          onClose={() => setModal(null)}
          wide
        >
          <div className="space-y-6">
            {modal.item.cover_image?.preview_url ? (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  src={modal.item.cover_image.preview_url}
                  alt={modal.item.cover_image.alt_text || modal.item.name}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={modal.item.status} />
              <span className="text-xs text-slate-500">
                {humanize(modal.item.program_type)}
              </span>
              {modal.item.network_name && (
                <span className="text-xs text-slate-500">
                  · {modal.item.network_name}
                </span>
              )}
            </div>

            {modal.item.description && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  About this campaign
                </h3>
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-600">
                  {modal.item.description}
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-[#e9dfce] bg-[#faf7f1] p-5">
              <p className="text-xs font-semibold tracking-wider text-[#9b7845] uppercase">
                Commission offer
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {modal.item.commission_details ||
                  `Commission details unavailable · ${humanize(
                    modal.item.commission_model,
                  )}`}
              </p>
            </section>

            {modal.item.eligibility_details && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Eligibility and requirements
                </h3>
                <p className="text-sm leading-7 whitespace-pre-wrap text-slate-600">
                  {modal.item.eligibility_details}
                </p>
              </section>
            )}

            <section className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Commission model</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {humanize(modal.item.commission_model)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Default currency</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {modal.item.default_currency}
                </p>
              </div>
            </section>

            {(modal.item.website_url || modal.item.terms_url) && (
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                {modal.item.website_url && (
                  <a
                    href={modal.item.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Visit website
                    <ExternalLink size={14} />
                  </a>
                )}

                {modal.item.terms_url && (
                  <a
                    href={modal.item.terms_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View terms
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setModal({
                      type: "edit-program",
                      item: modal.item,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#24466f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3656]"
                >
                  <Pencil size={15} />
                  Edit campaign
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {isAdmin && modal?.type === "edit-program" && (
        <Modal
          title="Edit affiliate program"
          description="Update partnership details, terms and availability."
          onClose={() => setModal(null)}
          wide
        >
          <ProgramForm
            initial={modal.item}
            onSubmit={saveProgram}
            onCancel={() => setModal(null)}
            isSaving={isSaving}
            error={updateProgram.error}
          />
        </Modal>
      )}
    </div>
  );
}
