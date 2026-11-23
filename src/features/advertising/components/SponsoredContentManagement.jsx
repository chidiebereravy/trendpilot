"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useSponsoredContent,
  useSponsoredContentOptions,
  useCreateSponsoredContent,
  useUpdateSponsoredContent,
} from "@/features/advertising/queries/advertising.queries";

const PAGE_SIZE = 10;

const EDITOR_STATUSES = ["draft", "pending_review"];
const ADMIN_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "paused",
  "archived",
];

const INITIAL_FORM = {
  campaign_id: "",
  article_id: "",
  disclosure_label: "Sponsored",
  status: "draft",
  starts_at: "",
  ends_at: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#14243d] outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

const statusStyles = {
  draft: "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  published: "bg-emerald-50 text-emerald-700",
  paused: "bg-orange-50 text-orange-700",
  archived: "bg-slate-100 text-slate-500",
};

function formatLabel(value) {
  return value
    ? value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "—";
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "The operation could not be completed. Please try again."
  );
}

function localDateValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function datePayload(value) {
  return value ? new Date(value).toISOString() : null;
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.draft
      }`}
    >
      {formatLabel(status)}
    </span>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs leading-5 text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

export default function SponsoredContentManagement({ isAdmin = false }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, page],
  );

  const listQuery = useSponsoredContent(filters);
  const optionsQuery = useSponsoredContentOptions(
    editingRecord?.id || null,
    formOpen,
  );

  const createMutation = useCreateSponsoredContent();
  const updateMutation = useUpdateSponsoredContent();

  const records = listQuery.data?.items || [];
  const total = listQuery.data?.pagination?.total || 0;
  const totalPages = listQuery.data?.pagination?.totalPages || 0;

  const campaigns = optionsQuery.data?.campaigns || [];
  const articles = optionsQuery.data?.articles || [];

  const isEditing = Boolean(editingRecord);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateForm() {
    setEditingRecord(null);
    setForm(INITIAL_FORM);
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
    setFormOpen(true);
  }

  function openEditForm(record) {
    setEditingRecord(record);
    setForm({
      campaign_id: record.campaign_id || "",
      article_id: record.article_id || "",
      disclosure_label: record.disclosure_label || "Sponsored",
      status: record.status || "draft",
      starts_at: localDateValue(record.starts_at),
      ends_at: localDateValue(record.ends_at),
    });
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;

    setFormOpen(false);
    setEditingRecord(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const payload = {
      campaign_id: form.campaign_id,
      article_id: form.article_id,
      disclosure_label: form.disclosure_label.trim(),
      status: form.status,
      starts_at: datePayload(form.starts_at),
      ends_at: datePayload(form.ends_at),
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          sponsoredContentId: editingRecord.id,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setFormOpen(false);
      setEditingRecord(null);
      setForm(INITIAL_FORM);
      setPage(1);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  async function changeStatus(record, nextStatus) {
    try {
      await updateMutation.mutateAsync({
        sponsoredContentId: record.id,
        payload: { status: nextStatus },
      });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  const availableStatuses = isAdmin ? ADMIN_STATUSES : EDITOR_STATUSES;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
            <FileText size={20} />
          </span>

          <div>
            <h2 className="text-lg font-semibold text-[#14243d]">
              Sponsored content
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Associate sponsored campaigns with editorial articles, manage
              disclosure labels, and control the sponsored-content review
              workflow.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203858]"
        >
          <Plus size={16} />
          New sponsored content
        </button>
      </section>

      {formOpen && (
        <section className="rounded-2xl border border-[#c4a16a]/40 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#a17b43] uppercase">
                Sponsored editorial configuration
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[#14243d]">
                {isEditing
                  ? "Edit sponsored content"
                  : "Create sponsored content"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Select an eligible campaign and article. The article&apos;s
                normal publishing workflow remains independent of this record.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              aria-label="Close sponsored content form"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>

          {optionsQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">
                Could not load campaign and article options
              </p>
              <p className="mt-1 text-sm text-red-800">
                {getErrorMessage(optionsQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => optionsQuery.refetch()}
                className="mt-3 text-sm font-semibold text-red-900 underline"
              >
                Try again
              </button>
            </div>
          ) : optionsQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Sponsored campaign"
                  hint="Only eligible direct or sponsored-content campaigns are listed."
                >
                  <select
                    required
                    value={form.campaign_id}
                    onChange={(event) =>
                      updateField("campaign_id", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select a campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name} · {formatLabel(campaign.status)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Editorial article"
                  hint="An article can be linked to only one sponsored-content record."
                >
                  <select
                    required
                    value={form.article_id}
                    onChange={(event) =>
                      updateField("article_id", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select an article</option>
                    {articles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.title} · {formatLabel(article.status)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Disclosure label"
                  hint="This label identifies the commercial relationship to readers."
                >
                  <input
                    required
                    minLength={1}
                    maxLength={80}
                    value={form.disclosure_label}
                    onChange={(event) =>
                      updateField("disclosure_label", event.target.value)
                    }
                    placeholder="Sponsored"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Workflow status"
                  hint={
                    isAdmin
                      ? "Administrators can approve and publish eligible records."
                      : "Editors can save drafts or submit records for review."
                  }
                >
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className={inputClass}
                  >
                    {!availableStatuses.includes(form.status) && (
                      <option value={form.status} disabled>
                        {formatLabel(form.status)} (current status)
                      </option>
                    )}
                    {availableStatuses.map((item) => (
                      <option key={item} value={item}>
                        {formatLabel(item)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Start date and time">
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) =>
                      updateField("starts_at", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="End date and time">
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) =>
                      updateField("ends_at", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              {articles.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    No eligible articles available
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Create an article first. Articles in draft, in review,
                    scheduled, or published status can be selected. Publishing
                    this sponsored record will additionally require the article
                    itself to be published.
                  </p>
                </div>
              )}

              {campaigns.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    No eligible sponsored campaigns available
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Create a direct or sponsored campaign using the sponsored
                    content channel before creating this record.
                  </p>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  Sponsored-content approval does not publish or modify the
                  linked article.
                </p>

                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={isSaving}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSaving ||
                      !campaigns.some((item) => item.id === form.campaign_id) ||
                      !articles.some((item) => item.id === form.article_id)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    {isEditing ? "Save changes" : "Create record"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="font-semibold text-[#14243d]">
              Sponsored content directory
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {total.toLocaleString("en-US")} record{total === 1 ? "" : "s"}{" "}
              found
            </p>
          </div>

          <button
            type="button"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
          >
            <RefreshCw
              size={14}
              className={listQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search disclosure labels..."
              aria-label="Search sponsored content"
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter sponsored content by status"
            className={inputClass}
          >
            <option value="">All statuses</option>
            {ADMIN_STATUSES.map((item) => (
              <option key={item} value={item}>
                {formatLabel(item)}
              </option>
            ))}
          </select>
        </div>

        {listQuery.isError ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-900">
              Could not load sponsored content
            </p>
            <p className="mt-1 text-sm text-red-800">
              {getErrorMessage(listQuery.error)}
            </p>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="mt-3 rounded-lg bg-[#14243d] px-3 py-2 text-xs font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : listQuery.isLoading ? (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <FileText size={28} className="mx-auto text-slate-300" />
            <h4 className="mt-3 text-sm font-semibold text-[#14243d]">
              No sponsored content found
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {search || status
                ? "Try changing your search or status filter."
                : "Create a sponsored-content record to associate an eligible campaign with an article."}
            </p>
            {!search && !status && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white"
              >
                <Plus size={14} />
                Create sponsored content
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {records.map((record) => (
              <article
                key={record.id}
                className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={record.status} />
                      <span className="rounded-full bg-[#f5f1e9] px-2.5 py-1 text-xs font-semibold text-[#8b6b3d]">
                        {record.disclosure_label}
                      </span>
                    </div>

                    <h4 className="mt-3 text-sm font-semibold text-[#14243d]">
                      {record.article?.title || "Article unavailable"}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {record.article?.slug
                        ? `/${record.article.slug}`
                        : "No article slug available"}
                    </p>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-600">
                          Campaign:
                        </span>{" "}
                        {record.campaign?.name || "Campaign unavailable"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-600">
                          Article status:
                        </span>{" "}
                        {formatLabel(record.article?.status)}
                      </p>
                      {record.starts_at && (
                        <p>
                          <span className="font-semibold text-slate-600">
                            Starts:
                          </span>{" "}
                          {new Date(record.starts_at).toLocaleString()}
                        </p>
                      )}
                      {record.ends_at && (
                        <p>
                          <span className="font-semibold text-slate-600">
                            Ends:
                          </span>{" "}
                          {new Date(record.ends_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditForm(record)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#c4a16a] hover:text-[#14243d]"
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>

                    {isAdmin && (
                      <select
                        aria-label={`Change sponsored content status for ${record.article?.title || "record"}`}
                        className="max-w-40 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600"
                        value={record.status}
                        disabled={updateMutation.isPending}
                        onChange={(event) =>
                          changeStatus(record, event.target.value)
                        }
                      >
                        {ADMIN_STATUSES.map((item) => (
                          <option key={item} value={item}>
                            {formatLabel(item)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {!listQuery.isError && !listQuery.isLoading && totalPages > 1 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total.toLocaleString("en-US")}{" "}
              total records
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || listQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || listQuery.isFetching}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#a17b43]" />
        <p className="text-xs leading-6 text-slate-500">
          Sponsored-content approval is separate from article publication.
          Administrators can publish a sponsored-content record only after its
          linked article is published and the campaign is active. The disclosure
          label should remain clear and visible to readers.
        </p>
      </div>
    </div>
  );
}
