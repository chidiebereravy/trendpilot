"use client";

import { useMemo, useState } from "react";
import { Edit3, Mail, Plus, Search, X } from "lucide-react";

import {
  useEmailCampaigns,
  useCreateEmailCampaign,
  useUpdateEmailCampaign,
  useEmailCampaignAction,
} from "@/features/email-marketing/queries/email-marketing.queries";
import { Play } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { Pause } from "lucide-react";
import EmailUncertainDeliveries from "@/features/email-marketing/components/EmailUncertainDeliveries";

const initialForm = {
  name: "",
  subject: "",
  preview_text: "",
  from_name: "",
  reply_to_email: "",
  html_content: "",
  text_content: "",
};

const statuses = [
  "draft",
  "pending_review",
  "scheduled",
  "sending",
  "needs_review",
  "sent",
  "paused",
  "cancelled",
  "failed",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    "The operation could not be completed. Please try again."
  );
}

function StatusPill({ status }) {
  const styles = {
    sent: "bg-emerald-50 text-emerald-700",
    sending: "bg-blue-50 text-blue-700",
    scheduled: "bg-violet-50 text-violet-700",
    paused: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
    needs_review: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status?.replaceAll("_", " ")}
    </span>
  );
}

export default function EmailCampaignManagement({ role }) {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    page: 1,
    pageSize: 10,
  });

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const queryFilters = useMemo(
    () => ({
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      page: filters.page,
      pageSize: filters.pageSize,
    }),
    [filters],
  );

  const campaignsQuery = useEmailCampaigns(queryFilters);
  const createMutation = useCreateEmailCampaign();
  const updateMutation = useUpdateEmailCampaign();

  const actionMutation = useEmailCampaignAction();
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reviewCampaignId, setReviewCampaignId] = useState(null);

  const isAdmin = role === "admin";

  const mutation = editingId ? updateMutation : createMutation;
  const busy = mutation.isPending;

  const campaigns = campaignsQuery.data?.items ?? [];
  const total = campaignsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  async function handleCampaignAction(campaign, action) {
    setActionError("");
    setActionMessage("");

    try {
      const result = await actionMutation.mutateAsync({
        campaignId: campaign.id,
        action,
      });

      setActionMessage(
        result.status === "sent"
          ? `${campaign.name}: sending completed.`
          : result.status === "needs_review"
            ? `${campaign.name}: sending stopped because some deliveries need manual review.`
            : `${campaign.name}: ${result.processed} processed, ${result.failed} failed, ${result.uncertain ?? 0} uncertain.${result.hasMore ? " Another batch is ready." : ""}`,
      );
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(initialForm);
    createMutation.reset();
    updateMutation.reset();
    setFormOpen(true);
  }

  function openEdit(campaign) {
    if (campaign.status !== "draft") return;

    setEditingId(campaign.id);
    setForm({
      name: campaign.name || "",
      subject: campaign.subject || "",
      preview_text: campaign.preview_text || "",
      from_name: campaign.from_name || "",
      reply_to_email: campaign.reply_to_email || "",
      html_content: campaign.html_content || "",
      text_content: campaign.text_content || "",
    });

    createMutation.reset();
    updateMutation.reset();
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
    createMutation.reset();
    updateMutation.reset();
  }

  function changeField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submitForm(event) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      preview_text: form.preview_text.trim() || null,
      from_name: form.from_name.trim() || null,
      reply_to_email: form.reply_to_email.trim() || null,
      html_content: form.html_content.trim() || null,
      text_content: form.text_content.trim() || null,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          campaignId: editingId,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      closeForm();
    } catch {
      // The mutation error is displayed inside the form.
    }
  }

  function changeFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: 1,
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-[#14243d]">
            Email campaigns
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage newsletter email campaigns.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203858]"
        >
          <Plus size={16} />
          New campaign
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={submitForm}
          className="rounded-2xl border border-[#c4a16a]/40 bg-[#fcfbf8] p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#14243d]">
                {editingId ? "Edit campaign draft" : "Create campaign draft"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Saving this form creates or updates a draft only. It does not
                send emails.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              aria-label="Close campaign form"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name">
              <input
                className={inputClass}
                name="name"
                value={form.name}
                onChange={changeField}
                placeholder="e.g. Weekly newsletter"
                minLength={2}
                maxLength={160}
                required
              />
            </Field>

            <Field label="Email subject">
              <input
                className={inputClass}
                name="subject"
                value={form.subject}
                onChange={changeField}
                placeholder="Your newsletter subject"
                minLength={2}
                maxLength={200}
                required
              />
            </Field>

            <Field label="Preview text">
              <input
                className={inputClass}
                name="preview_text"
                value={form.preview_text}
                onChange={changeField}
                placeholder="Short text shown in the inbox preview"
                maxLength={250}
              />
            </Field>

            <Field label="Sender name">
              <input
                className={inputClass}
                name="from_name"
                value={form.from_name}
                onChange={changeField}
                placeholder="TrendPilot"
                maxLength={100}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Reply-to email">
                <input
                  className={inputClass}
                  type="email"
                  name="reply_to_email"
                  value={form.reply_to_email}
                  onChange={changeField}
                  placeholder="hello@example.com"
                  maxLength={254}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="HTML email content">
                <textarea
                  className={inputClass}
                  name="html_content"
                  value={form.html_content}
                  onChange={changeField}
                  rows={12}
                  maxLength={200000}
                  placeholder="Write or paste your HTML email content..."
                  spellCheck={false}
                />
              </Field>
              <p className="mt-1 text-xs text-slate-400">
                HTML is sent as email content, not rendered as an editor
                preview. Use trusted, sanitized content.
              </p>
            </div>

            <div className="sm:col-span-2">
              <Field label="Plain-text email content">
                <textarea
                  className={inputClass}
                  name="text_content"
                  value={form.text_content}
                  onChange={changeField}
                  rows={8}
                  maxLength={100000}
                  placeholder="Provide a plain-text version of your email..."
                />
              </Field>
            </div>
          </div>

          {formErrorMessage(mutation.error) && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formErrorMessage(mutation.error)}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving..." : editingId ? "Save draft" : "Create draft"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            className={`${inputClass} pl-9`}
            value={filters.search}
            onChange={(event) => changeFilter("search", event.target.value)}
            placeholder="Search campaigns..."
          />
        </div>

        <select
          className={`${inputClass} sm:w-52`}
          value={filters.status}
          onChange={(event) => changeFilter("status", event.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {actionMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {actionMessage}
        </div>
      )}

      {campaignsQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading email campaigns...
        </div>
      ) : campaignsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage(campaignsQuery.error)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Mail className="mx-auto text-slate-300" size={28} />
          <h3 className="mt-3 text-sm font-semibold text-slate-700">
            No email campaigns found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Create a draft to start preparing your next newsletter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-4">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#14243d]">
                        {campaign.name}
                      </h3>
                      <StatusPill status={campaign.status} />
                    </div>

                    <p className="mt-1 text-sm text-slate-600">
                      {campaign.subject}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Updated {new Date(campaign.updated_at).toLocaleString()}
                    </p>
                  </div>

                  {isAdmin && campaign.delivery_counts && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {[
                        ["Queued", "queued"],
                        ["Processing", "processing"],
                        ["Sent", "sent"],
                        ["Delivered", "delivered"],
                        ["Opened", "opened"],
                        ["Clicked", "clicked"],
                        ["Bounced", "bounced"],
                        ["Failed", "failed"],
                        ["Suppressed", "suppressed"],
                        ["Complained", "complained"],
                        ["Uncertain", "uncertain"],
                      ].map(([label, key]) => (
                        <span key={key}>
                          {label}:{" "}
                          <strong className="font-semibold text-slate-700">
                            {campaign.delivery_counts[key] ?? 0}
                          </strong>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 self-start">
                    {campaign.status === "draft" && (
                      <button
                        type="button"
                        onClick={() => openEdit(campaign)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#c4a16a]"
                      >
                        <Edit3 size={14} />
                        Edit draft
                      </button>
                    )}

                    {isAdmin && campaign.status === "draft" && (
                      <button
                        type="button"
                        disabled={actionMutation.isPending}
                        onClick={() => handleCampaignAction(campaign, "start")}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#14243d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#203858] disabled:opacity-50"
                      >
                        <Play size={14} />
                        Send campaign
                      </button>
                    )}

                    {isAdmin && campaign.status === "sending" && (
                      <>
                        <button
                          type="button"
                          disabled={actionMutation.isPending}
                          onClick={() =>
                            handleCampaignAction(campaign, "process")
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-[#14243d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          <RefreshCw size={14} />
                          Process next batch
                        </button>

                        <button
                          type="button"
                          disabled={actionMutation.isPending}
                          onClick={() =>
                            handleCampaignAction(campaign, "pause")
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 disabled:opacity-50"
                        >
                          <Pause size={14} />
                          Pause
                        </button>
                      </>
                    )}

                    {isAdmin && campaign.status === "paused" && (
                      <button
                        type="button"
                        disabled={actionMutation.isPending}
                        onClick={() => handleCampaignAction(campaign, "resume")}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#14243d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <Play size={14} />
                        Resume
                      </button>
                    )}

                    {isAdmin && campaign.status === "failed" && (
                      <button
                        type="button"
                        disabled={actionMutation.isPending}
                        onClick={() => handleCampaignAction(campaign, "retry")}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#14243d] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <RefreshCw size={14} />
                        Retry failed
                      </button>
                    )}

                    {isAdmin &&
                      ((campaign.delivery_counts?.uncertain ?? 0) > 0 ||
                        campaign.status === "needs_review") && (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewCampaignId((current) =>
                              current === campaign.id ? null : campaign.id,
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          Review uncertain (
                          {campaign.delivery_counts?.uncertain ?? 0})
                        </button>
                      )}
                  </div>
                  {isAdmin && reviewCampaignId === campaign.id && (
                    <EmailUncertainDeliveries
                      campaignId={campaign.id}
                      onResolved={() => campaignsQuery.refetch()}
                    />
                  )}
                </div>
                isAdmin && reviewCampaignId === campaign.id && (
                <EmailUncertainDeliveries
                  campaignId={campaign.id}
                  onResolved={() => campaignsQuery.refetch()}
                />
                ),
              </div>
            ))}
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-400">
            Showing {campaigns.length} of {total} campaigns · Page{" "}
            {filters.page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
              disabled={filters.page <= 1 || campaignsQuery.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.min(totalPages, current.page + 1),
                }))
              }
              disabled={filters.page >= totalPages || campaignsQuery.isFetching}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formErrorMessage(error) {
  return error ? errorMessage(error) : "";
}
