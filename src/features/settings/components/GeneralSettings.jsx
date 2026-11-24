"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  LoaderCircle,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useMedia } from "@/features/media/hooks/useMedia";
import {
  useGeneralSettings,
  useUpdateGeneralSettings,
} from "@/features/settings/hooks/useGeneralSettings";
import Image from "next/image";

const TEXT_FIELDS = [
  "publicEmail",
  "supportEmail",
  "contactPhone",
  "contactAddress",
  "facebookUrl",
  "instagramUrl",
  "xUrl",
  "youtubeUrl",
  "linkedinUrl",
];

function getFormValues(settings) {
  return {
    tagline: settings.tagline ?? "",
    logoMediaAssetId: settings.logoMediaAssetId ?? "",
    faviconMediaAssetId: settings.faviconMediaAssetId ?? "",
    publicEmail: settings.publicEmail ?? "",
    supportEmail: settings.supportEmail ?? "",
    contactPhone: settings.contactPhone ?? "",
    contactAddress: settings.contactAddress ?? "",
    facebookUrl: settings.facebookUrl ?? "",
    instagramUrl: settings.instagramUrl ?? "",
    xUrl: settings.xUrl ?? "",
    youtubeUrl: settings.youtubeUrl ?? "",
    linkedinUrl: settings.linkedinUrl ?? "",
  };
}

function SettingsCard({ icon: Icon, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
          <Icon size={19} />
        </span>

        <div>
          <h2 className="text-base font-semibold text-[#14243d]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  type = "text",
  multiline = false,
}) {
  const className =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#14243d] outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-4 focus:ring-[#c4a16a]/10";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">{label}</label>

        {maxLength && (
          <span className="text-xs text-slate-400 tabular-nums">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
          className={`${className} resize-y`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={className}
        />
      )}

      {hint && <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

function MediaSelect({ label, value, onChange, assets, isLoading, error }) {
  const selectedAsset = assets.find((asset) => asset.id === value);

  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-[#14243d] transition outline-none focus:border-[#c4a16a] focus:ring-4 focus:ring-[#c4a16a]/10 disabled:cursor-wait disabled:bg-slate-50"
      >
        <option value="">No image selected</option>

        {value && !selectedAsset && (
          <option value={value} disabled>
            Current selection — not in the latest media results
          </option>
        )}

        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.original_filename}
          </option>
        ))}
      </select>

      {selectedAsset?.preview_url && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <Image
            src={selectedAsset.preview_url}
            alt={selectedAsset.alt_text || selectedAsset.original_filename}
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 rounded-lg border border-slate-200 bg-white object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#14243d]">
              {selectedAsset.original_filename}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedAsset.width && selectedAsset.height
                ? `${selectedAsset.width} × ${selectedAsset.height}`
                : "Published media asset"}
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <p className="mt-2 text-xs text-slate-500">
          Loading published media...
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-amber-700">
          The Media Library could not be loaded. You can still save other
          settings.
        </p>
      )}
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, description, warning }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <Icon
          size={19}
          className={warning ? "text-amber-600" : "text-[#a17b43]"}
        />
      </div>

      <p className="mt-3 text-xl font-semibold break-words text-[#14243d]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function normalizePayload(form) {
  const payload = {
    tagline: form.tagline.trim(),
    logoMediaAssetId: form.logoMediaAssetId || null,
    faviconMediaAssetId: form.faviconMediaAssetId || null,
  };

  for (const field of TEXT_FIELDS) {
    payload[field] = form[field].trim() || null;
  }

  return payload;
}

export default function GeneralSettings() {
  const settingsQuery = useGeneralSettings();
  const updateMutation = useUpdateGeneralSettings();

  const mediaQuery = useMedia({
    status: "published",
    page: 1,
    pageSize: 50,
  });

  const [form, setForm] = useState(null);
  const [savedMessage, setSavedMessage] = useState("");

  const settings = settingsQuery.data;

  const publishedAssets = useMemo(
    () =>
      (mediaQuery.data?.items ?? []).filter(
        (asset) =>
          asset.status === "published" &&
          asset.bucket_id === "trendpilot-media",
      ),
    [mediaQuery.data],
  );

  useEffect(() => {
    function initializeSettings() {
      if (settings) {
        setForm(getFormValues(settings));
      }
    }
    initializeSettings();
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings || !form) return false;

    return JSON.stringify(form) !== JSON.stringify(getFormValues(settings));
  }, [form, settings]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSavedMessage("");
    updateMutation.reset();
  }

  function handleReset() {
    if (!settings) return;

    setForm(getFormValues(settings));
    setSavedMessage("");
    updateMutation.reset();
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form || !isDirty || updateMutation.isPending) return;

    updateMutation.mutate(normalizePayload(form), {
      onSuccess: () => {
        setSavedMessage("Your general settings have been saved successfully.");
      },
    });
  }

  if (settingsQuery.isLoading || !form) {
    if (settingsQuery.isError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Unable to load general settings
          </h2>
          <p className="mt-2 text-sm text-red-700">
            {settingsQuery.error?.response?.data?.error?.message ||
              settingsQuery.error?.message ||
              "Please refresh the page and try again."}
          </p>

          <button
            type="button"
            onClick={() => settingsQuery.refetch()}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-800 shadow-sm"
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoaderCircle className="animate-spin text-[#a17b43]" size={30} />
      </div>
    );
  }

  const configuredSocialProfiles = [
    form.facebookUrl,
    form.instagramUrl,
    form.xUrl,
    form.youtubeUrl,
    form.linkedinUrl,
  ].filter((value) => value.trim()).length;

  const configuredContactDetails = [
    form.publicEmail,
    form.supportEmail,
    form.contactPhone,
    form.contactAddress,
  ].filter((value) => value.trim()).length;

  const warnings = [
    !form.tagline.trim() && "The website tagline is empty.",
    !form.logoMediaAssetId && "No website logo has been selected.",
    !form.faviconMediaAssetId && "No favicon has been selected.",
    !form.publicEmail.trim() && "No public contact email is configured.",
  ].filter(Boolean);

  const errorMessage =
    updateMutation.error?.response?.data?.error?.message ||
    updateMutation.error?.message;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#a17b43] uppercase">
            <Globe2 size={14} />
            Website configuration
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#14243d] sm:text-3xl">
            General settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage your website identity, brand assets, contact information, and
            official social profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto">
          <ShieldCheck size={15} className="text-emerald-600" />
          Administrator settings
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={ImageIcon}
          label="Brand logo"
          value={form.logoMediaAssetId ? "Selected" : "Not configured"}
          description="Published Media Library asset."
          warning={!form.logoMediaAssetId}
        />

        <StatusCard
          icon={Globe2}
          label="Favicon"
          value={form.faviconMediaAssetId ? "Selected" : "Not configured"}
          description="Browser and shortcut icon."
          warning={!form.faviconMediaAssetId}
        />

        <StatusCard
          icon={Mail}
          label="Contact details"
          value={`${configuredContactDetails} of 4`}
          description="Public and support contact information."
          warning={configuredContactDetails === 0}
        />

        <StatusCard
          icon={ExternalLink}
          label="Social profiles"
          value={`${configuredSocialProfiles} of 5`}
          description="Official social profile links."
          warning={configuredSocialProfiles === 0}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#14243d]">
            {warnings.length ? (
              <AlertTriangle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
          </span>

          <div>
            <h2 className="font-semibold text-[#14243d]">
              Configuration overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {warnings.length
                ? `${warnings.length} item${warnings.length === 1 ? "" : "s"} may need attention.`
                : "Your basic website identity settings are configured."}
            </p>
          </div>
        </div>

        {warnings.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {warnings.map((warning) => (
              <li
                key={warning}
                className="flex items-start gap-2 text-sm text-slate-600"
              >
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                {warning}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Last updated:{" "}
          {settings.updatedAt
            ? new Date(settings.updatedAt).toLocaleString()
            : "Not available"}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SettingsCard
          icon={ImageIcon}
          title="Brand identity"
          description="Configure the public-facing identity and visual assets used by TrendPilot."
        >
          <TextField
            label="Website tagline"
            value={form.tagline}
            onChange={(value) => updateField("tagline", value)}
            placeholder="Navigate Ideas. Discover Opportunities."
            maxLength={160}
            hint="A concise description of your website. Used wherever the site tagline is displayed."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <MediaSelect
              label="Website logo"
              value={form.logoMediaAssetId}
              onChange={(value) => updateField("logoMediaAssetId", value)}
              assets={publishedAssets}
              isLoading={mediaQuery.isLoading}
              error={mediaQuery.isError}
            />

            <MediaSelect
              label="Favicon"
              value={form.faviconMediaAssetId}
              onChange={(value) => updateField("faviconMediaAssetId", value)}
              assets={publishedAssets}
              isLoading={mediaQuery.isLoading}
              error={mediaQuery.isError}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-600">
              Only published assets in the public TrendPilot Media Library
              bucket can be selected.
            </p>
            <Link
              href="/dashboard/media"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#a17b43] hover:text-[#14243d]"
            >
              Open Media Library
              <ExternalLink size={14} />
            </Link>
          </div>

          {mediaQuery.isError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Published media could not be loaded. You can still update the
              other settings and choose branding assets later.
              <button
                type="button"
                onClick={() => mediaQuery.refetch()}
                className="ml-2 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {!mediaQuery.isLoading &&
            !mediaQuery.isError &&
            publishedAssets.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                No published branding assets were found in the first page of the
                Media Library. Upload and publish your logo or favicon there
                first.
              </p>
            )}
        </SettingsCard>

        <SettingsCard
          icon={Mail}
          title="Contact information"
          description="Set the contact details visitors and partners can use to reach your website."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Public email"
              type="email"
              value={form.publicEmail}
              onChange={(value) => updateField("publicEmail", value)}
              placeholder="hello@example.com"
              maxLength={254}
              hint="General enquiries and public-facing contact."
            />

            <TextField
              label="Support email"
              type="email"
              value={form.supportEmail}
              onChange={(value) => updateField("supportEmail", value)}
              placeholder="support@example.com"
              maxLength={254}
              hint="Customer support and assistance."
            />

            <TextField
              label="Contact phone"
              type="tel"
              value={form.contactPhone}
              onChange={(value) => updateField("contactPhone", value)}
              placeholder="+234 800 000 0000"
              maxLength={40}
            />

            <TextField
              label="Contact address"
              value={form.contactAddress}
              onChange={(value) => updateField("contactAddress", value)}
              placeholder="Business or office address"
              maxLength={500}
              multiline
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={ExternalLink}
          title="Social profiles"
          description="Add the official social media destinations associated with TrendPilot. Use secure HTTPS links."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Facebook"
              value={form.facebookUrl}
              onChange={(value) => updateField("facebookUrl", value)}
              placeholder="https://www.facebook.com/yourpage"
              maxLength={2048}
            />

            <TextField
              label="Instagram"
              value={form.instagramUrl}
              onChange={(value) => updateField("instagramUrl", value)}
              placeholder="https://www.instagram.com/yourprofile"
              maxLength={2048}
            />

            <TextField
              label="X"
              value={form.xUrl}
              onChange={(value) => updateField("xUrl", value)}
              placeholder="https://x.com/yourprofile"
              maxLength={2048}
            />

            <TextField
              label="YouTube"
              value={form.youtubeUrl}
              onChange={(value) => updateField("youtubeUrl", value)}
              placeholder="https://www.youtube.com/@yourchannel"
              maxLength={2048}
            />

            <TextField
              label="LinkedIn"
              value={form.linkedinUrl}
              onChange={(value) => updateField("linkedinUrl", value)}
              placeholder="https://www.linkedin.com/company/yourpage"
              maxLength={2048}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={ShieldCheck}
          title="Settings administration"
          description="General settings are restricted to administrators."
        >
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0 text-emerald-600"
            />
            <div>
              <p className="text-sm font-semibold text-[#14243d]">
                Protected configuration
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Changes are validated by the server and database before they are
                saved. Branding assets must remain published while they are
                assigned as the site logo or favicon.
              </p>
            </div>
          </div>
        </SettingsCard>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {savedMessage && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={17} />
            {savedMessage}
          </div>
        )}

        <div className="sticky bottom-4 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {isDirty
              ? "You have unsaved changes."
              : "All settings are up to date."}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || updateMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={16} />
              Reset changes
            </button>

            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
