"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Globe2,
  Image as ImageIcon,
  LoaderCircle,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useSeoSettings } from "@/features/seo/queries/seo.queries";
import { useUpdateSeoSettings } from "@/features/seo/mutations/seo.mutations";

function getFormValues(settings) {
  return {
    siteName: settings.siteName ?? "",
    defaultTitle: settings.defaultTitle ?? "",
    titleTemplate: settings.titleTemplate ?? "",
    defaultDescription: settings.defaultDescription ?? "",
    defaultSocialImageUrl: settings.defaultSocialImageUrl ?? "",
    searchIndexingEnabled: settings.searchIndexingEnabled ?? true,
    sitemapEnabled: settings.sitemapEnabled ?? true,
    includeArticles: settings.includeArticles ?? true,
    includeCategories: settings.includeCategories ?? true,
  };
}

function SettingsCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
  multiline = false,
}) {
  const sharedClassName =
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
          className={`${sharedClassName} resize-y`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={sharedClassName}
        />
      )}

      {hint && <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-xl border border-slate-100 p-4 transition hover:border-slate-200">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#14243d]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#a17b43]"
      />
    </label>
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

      <p className="mt-3 text-xl font-semibold text-[#14243d]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default function SeoDashboard() {
  const settingsQuery = useSeoSettings();
  const updateMutation = useUpdateSeoSettings();

  const [form, setForm] = useState(null);
  const [savedMessage, setSavedMessage] = useState("");

  const settings = settingsQuery.data;

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

    const payload = {
      ...form,
      defaultSocialImageUrl: form.defaultSocialImageUrl.trim() || null,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setSavedMessage("Your SEO settings have been saved successfully.");
      },
    });
  }

  if (settingsQuery.isLoading || !form) {
    if (settingsQuery.isError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Unable to load SEO settings
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

  const configurationWarnings = [
    !form.searchIndexingEnabled && "Search-engine indexing is disabled.",
    !form.sitemapEnabled && "The XML sitemap is disabled.",
    !form.defaultSocialImageUrl.trim() &&
      "No default social-sharing image is configured.",
    !form.includeArticles && "Articles are excluded from the sitemap.",
    !form.includeCategories && "Categories are excluded from the sitemap.",
  ].filter(Boolean);

  const errorMessage =
    updateMutation.error?.response?.data?.error?.message ||
    updateMutation.error?.message;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#a17b43] uppercase">
            <Search size={14} />
            Website configuration
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#14243d] sm:text-3xl">
            SEO settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage your website identity, search visibility, sitemap
            preferences, and default search appearance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto">
          <ShieldCheck size={15} className="text-emerald-600" />
          Configuration
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={Globe2}
          label="Search visibility"
          value={form.searchIndexingEnabled ? "Enabled" : "Disabled"}
          description={
            form.searchIndexingEnabled
              ? "Search engines may index public pages."
              : "Public pages should be marked noindex."
          }
          warning={!form.searchIndexingEnabled}
        />

        <StatusCard
          icon={FileCode2}
          label="XML sitemap"
          value={form.sitemapEnabled ? "Enabled" : "Disabled"}
          description={
            form.sitemapEnabled
              ? "Sitemap generation is configured."
              : "The sitemap is currently disabled."
          }
          warning={!form.sitemapEnabled}
        />

        <StatusCard
          icon={Search}
          label="Sitemap content"
          value={`${Number(form.includeArticles) + Number(form.includeCategories)} of 2`}
          description="Article and category inclusion settings."
        />

        <StatusCard
          icon={ImageIcon}
          label="Social image"
          value={form.defaultSocialImageUrl.trim() ? "Configured" : "Missing"}
          description="Default image for social-sharing metadata."
          warning={!form.defaultSocialImageUrl.trim()}
        />
      </div>

      {/* Configuration health */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#14243d]">
            {configurationWarnings.length ? (
              <AlertTriangle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
          </span>

          <div className="min-w-0">
            <h2 className="font-semibold text-[#14243d]">
              Configuration health
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {configurationWarnings.length
                ? `${configurationWarnings.length} configuration item${configurationWarnings.length === 1 ? "" : "s"} to review.`
                : "Your basic SEO configuration has no outstanding warnings."}
            </p>
          </div>
        </div>

        {configurationWarnings.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {configurationWarnings.map((warning) => (
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
      </section>

      {/* Settings form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <SettingsCard
          icon={Globe2}
          title="Site identity"
          description="Set the default identity and search-result presentation for TrendPilot."
        >
          <TextField
            label="Website name"
            value={form.siteName}
            onChange={(value) => updateField("siteName", value)}
            placeholder="TrendPilot"
            maxLength={80}
            hint="Used as the website identity in metadata and structured data."
          />

          <TextField
            label="Default SEO title"
            value={form.defaultTitle}
            onChange={(value) => updateField("defaultTitle", value)}
            placeholder="TrendPilot - Navigate Ideas. Discover Opportunities."
            maxLength={70}
            hint="Fallback title for public pages without their own SEO title."
          />

          <TextField
            label="Title template"
            value={form.titleTemplate}
            onChange={(value) => updateField("titleTemplate", value)}
            placeholder="%s | TrendPilot"
            maxLength={120}
            hint="Use %s as the placeholder for an individual page title."
          />

          <TextField
            label="Default meta description"
            value={form.defaultDescription}
            onChange={(value) => updateField("defaultDescription", value)}
            placeholder="Describe what readers can discover on TrendPilot."
            maxLength={170}
            multiline
            hint="Used when a public page does not have its own SEO description."
          />

          <TextField
            label="Default social-sharing image"
            value={form.defaultSocialImageUrl}
            onChange={(value) => updateField("defaultSocialImageUrl", value)}
            placeholder="https://example.com/social-image.jpg or /images/social-image.jpg"
            maxLength={2048}
            hint="Use an HTTPS image URL or a root-relative path. Leave empty to remove the default."
          />

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            Canonical website origin is managed through the application
            environment configuration, not from this form.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={Search}
          title="Search-engine indexing"
          description="Control whether public website pages should be discoverable in search engines."
        >
          <ToggleField
            label="Enable search-engine indexing"
            description="When disabled, public pages should receive noindex directives. This does not remove existing search results immediately."
            checked={form.searchIndexingEnabled}
            onChange={(value) => updateField("searchIndexingEnabled", value)}
          />

          {!form.searchIndexingEnabled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Search visibility is disabled. We&apos;ll apply this setting to
              public-page metadata when the global indexing integration is
              implemented.
            </div>
          )}
        </SettingsCard>

        <SettingsCard
          icon={FileCode2}
          title="XML sitemap"
          description="Control sitemap availability and which published content types are eligible for inclusion."
        >
          <ToggleField
            label="Enable XML sitemap"
            description="Allow the website sitemap endpoint to publish eligible public URLs."
            checked={form.sitemapEnabled}
            onChange={(value) => updateField("sitemapEnabled", value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleField
              label="Include published articles"
              description="Include eligible published article URLs."
              checked={form.includeArticles}
              onChange={(value) => updateField("includeArticles", value)}
            />

            <ToggleField
              label="Include published categories"
              description="Include eligible published category URLs."
              checked={form.includeCategories}
              onChange={(value) => updateField("includeCategories", value)}
            />
          </div>
        </SettingsCard>

        {/* Save feedback */}
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
