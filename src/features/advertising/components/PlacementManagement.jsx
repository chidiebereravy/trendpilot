"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  useAdPlacements,
  useCreateAdPlacement,
  useUpdateAdPlacement,
} from "@/features/advertising/queries/advertising.queries";

const PAGE_SIZE = 10;

const INITIAL_FORM = {
  name: "",
  placement_key: "",
  description: "",
  page_scope: "sitewide",
  position: "in_content",
  format: "responsive",
  status: "inactive",
  width: "",
  height: "",
  responsive: true,
};

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  inactive: "bg-slate-100 text-slate-600 ring-slate-500/15",
  archived: "bg-amber-50 text-amber-700 ring-amber-600/15",
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
    "Something went wrong. Please try again."
  );
}

function getPlacementForm(placement) {
  const dimensions = placement.dimensions || {};

  return {
    name: placement.name || "",
    placement_key: placement.placement_key || "",
    description: placement.description || "",
    page_scope: placement.page_scope || "sitewide",
    position: placement.position || "in_content",
    format: placement.format || "responsive",
    status: placement.status || "inactive",
    width: dimensions.width?.toString() || "",
    height: dimensions.height?.toString() || "",
    responsive: dimensions.responsive ?? true,
  };
}

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        STATUS_STYLES[status] || STATUS_STYLES.inactive
      }`}
    >
      {formatLabel(status)}
    </span>
  );
}

function FormField({ label, children, hint }) {
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#14243d] outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

export default function PlacementManagement() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pageScope, setPageScope] = useState("");
  const [position, setPosition] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      pageScope: pageScope || undefined,
      position: position || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, status, pageScope, position, page],
  );

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdPlacements(filters);

  const createMutation = useCreateAdPlacement();
  const updateMutation = useUpdateAdPlacement();

  const isEditing = Boolean(selectedPlacement);
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const placements = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const total = data?.total || 0;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateForm() {
    setSelectedPlacement(null);
    setForm(INITIAL_FORM);
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
    setFormOpen(true);
  }

  function openEditForm(placement) {
    setSelectedPlacement(placement);
    setForm(getPlacementForm(placement));
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
    setFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setFormOpen(false);
    setSelectedPlacement(null);
    setForm(INITIAL_FORM);
    setFormError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const dimensions = {
      unit: "px",
      responsive: form.responsive,
      ...(form.width ? { width: Number(form.width) } : {}),
      ...(form.height ? { height: Number(form.height) } : {}),
    };

    const payload = {
      name: form.name.trim(),
      placement_key: form.placement_key.trim(),
      description: form.description.trim() || null,
      page_scope: form.page_scope,
      position: form.position,
      format: form.format,
      status: form.status,
      dimensions,
    };

    const mutationOptions = {
      onSuccess: () => {
        setFormOpen(false);
        setSelectedPlacement(null);
        setForm(INITIAL_FORM);
        setFormError("");
        setPage(1);
      },
      onError: (mutationError) => {
        setFormError(getErrorMessage(mutationError));
      },
    };

    if (isEditing) {
      updateMutation.mutate(
        {
          placementId: selectedPlacement.id,
          payload,
        },
        mutationOptions,
      );
    } else {
      createMutation.mutate(payload, mutationOptions);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
            <LayoutGrid size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#14243d]">
              Ad Placements
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Define reusable advertising positions across your homepage,
              articles, categories, and other areas of TrendPilot.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#203858]"
        >
          <Plus size={16} />
          Create placement
        </button>
      </section>

      {formOpen && (
        <section className="rounded-2xl border border-[#c4a16a]/40 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#a17b43] uppercase">
                Placement configuration
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[#14243d]">
                {isEditing ? "Edit ad placement" : "Create ad placement"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Configure where an advertising unit can appear. New placements
                start inactive until explicitly activated.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={isSaving}
              aria-label="Close placement form"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Placement name">
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Article top banner"
                  className={inputClass}
                />
              </FormField>

              <FormField
                label="Placement key"
                hint="Unique identifier used by future ad-serving integrations."
              >
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  pattern="[a-z0-9][a-z0-9_-]{1,79}"
                  value={form.placement_key}
                  onChange={(event) =>
                    updateField(
                      "placement_key",
                      event.target.value.toLowerCase(),
                    )
                  }
                  placeholder="article_top_banner"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                rows={2}
                maxLength={1000}
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Describe where this placement will appear and its intended use."
                className={`${inputClass} resize-y`}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Page scope">
                <select
                  value={form.page_scope}
                  onChange={(event) =>
                    updateField("page_scope", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="sitewide">Sitewide</option>
                  <option value="homepage">Homepage</option>
                  <option value="article">Article</option>
                  <option value="category">Category</option>
                  <option value="search">Search</option>
                  <option value="other">Other</option>
                </select>
              </FormField>

              <FormField label="Position">
                <select
                  value={form.position}
                  onChange={(event) =>
                    updateField("position", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="header">Header</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="in_content">In content</option>
                  <option value="article_top">Article top</option>
                  <option value="article_bottom">Article bottom</option>
                  <option value="footer">Footer</option>
                  <option value="feed">Feed</option>
                  <option value="custom">Custom</option>
                </select>
              </FormField>

              <FormField label="Ad format">
                <select
                  value={form.format}
                  onChange={(event) =>
                    updateField("format", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="responsive">Responsive</option>
                  <option value="display">Display</option>
                  <option value="native">Native</option>
                  <option value="banner">Banner</option>
                  <option value="in_feed">In-feed</option>
                  <option value="custom">Custom</option>
                </select>
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="inactive">Inactive</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </FormField>

              <FormField
                label="Width (px)"
                hint="Leave blank for automatic width."
              >
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.width}
                  onChange={(event) => updateField("width", event.target.value)}
                  placeholder="e.g. 728"
                  className={inputClass}
                />
              </FormField>

              <FormField
                label="Height (px)"
                hint="Leave blank for automatic height."
              >
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  value={form.height}
                  onChange={(event) =>
                    updateField("height", event.target.value)
                  }
                  placeholder="e.g. 90"
                  className={inputClass}
                />
              </FormField>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <input
                type="checkbox"
                checked={form.responsive}
                onChange={(event) =>
                  updateField("responsive", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#14243d]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#14243d]">
                  Responsive placement
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Allow the placement dimensions to adapt to the available
                  display area.
                </span>
              </span>
            </label>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
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
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                {isEditing ? "Save changes" : "Create placement"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.025)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="font-semibold text-[#14243d]">
              Placement directory
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {total.toLocaleString("en-US")} placement
              {total === 1 ? "" : "s"} configured
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 lg:self-auto"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
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
              placeholder="Search placements..."
              aria-label="Search placements"
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className={inputClass}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={pageScope}
            onChange={(event) => {
              setPageScope(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by page scope"
            className={inputClass}
          >
            <option value="">All page scopes</option>
            <option value="sitewide">Sitewide</option>
            <option value="homepage">Homepage</option>
            <option value="article">Article</option>
            <option value="category">Category</option>
            <option value="search">Search</option>
            <option value="other">Other</option>
          </select>

          <select
            value={position}
            onChange={(event) => {
              setPosition(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by position"
            className={inputClass}
          >
            <option value="">All positions</option>
            <option value="header">Header</option>
            <option value="sidebar">Sidebar</option>
            <option value="in_content">In content</option>
            <option value="article_top">Article top</option>
            <option value="article_bottom">Article bottom</option>
            <option value="footer">Footer</option>
            <option value="feed">Feed</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {isError ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-900">
              Could not load ad placements
            </p>
            <p className="mt-1 text-sm text-red-800">
              {getErrorMessage(error)}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-[#14243d] px-3 py-2 text-xs font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        ) : placements.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <LayoutGrid size={28} className="mx-auto text-slate-300" />
            <h4 className="mt-3 text-sm font-semibold text-[#14243d]">
              No placements found
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {search || status || pageScope || position
                ? "Try changing your search or filters."
                : "Create your first reusable advertising placement to get started."}
            </p>
            {!search && !status && !pageScope && !position && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white"
              >
                <Plus size={14} />
                Create placement
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="rounded-l-lg px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Placement
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Page scope
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Position
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Format
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Status
                  </th>
                  <th className="rounded-r-lg px-4 py-3 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {placements.map((placement) => (
                  <tr key={placement.id} className="group">
                    <td className="border-b border-slate-100 px-4 py-4">
                      <p className="text-sm font-semibold text-[#14243d]">
                        {placement.name}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-400">
                        {placement.placement_key}
                      </p>
                      {placement.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {placement.description}
                        </p>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                      {formatLabel(placement.page_scope)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                      {formatLabel(placement.position)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <p className="text-sm text-slate-600">
                        {formatLabel(placement.format)}
                      </p>
                      {placement.dimensions && (
                        <p className="mt-1 text-xs text-slate-400">
                          {placement.dimensions.responsive
                            ? "Responsive"
                            : [
                                placement.dimensions.width,
                                placement.dimensions.height,
                              ]
                                .filter(Boolean)
                                .join(" × ") + " px"}
                        </p>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4">
                      <StatusPill status={placement.status} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditForm(placement)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#c4a16a] hover:text-[#14243d]"
                      >
                        <Edit3 size={13} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isError && !isLoading && totalPages > 1 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total.toLocaleString("en-US")}{" "}
              total placements
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || isFetching}
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
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#a17b43]" />
        <p className="text-xs leading-6 text-slate-500">
          Placement configuration defines where ads may appear; it does not
          itself publish advertisements or activate a network integration.
          Public ad serving will use a separate controlled delivery layer.
          Archived placements remain in the database for historical integrity.
        </p>
      </div>
    </div>
  );
}
