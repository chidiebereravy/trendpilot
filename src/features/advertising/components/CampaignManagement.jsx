"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Edit3, Megaphone, Plus, Search, X } from "lucide-react";

import {
  useCampaigns,
  useAdPlacements,
  useCreateCampaign,
  useUpdateCampaign,
} from "@/features/advertising/queries/advertising.queries";

const statuses = [
  "draft",
  "pending_review",
  "scheduled",
  "active",
  "paused",
  "completed",
  "rejected",
  "archived",
];

const restrictedStatuses = ["active", "rejected"];

const initialForm = {
  name: "",
  placement_ids: [],
  campaign_type: "direct",
  channel: "display",
  objective: "",
  headline: "",
  description: "",
  image_url: "",
  image_alt_text: "",
  call_to_action_text: "",
  destination_url: "",
  status: "draft",
  starts_at: "",
  ends_at: "",
};

function localDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}

function datePayload(value) {
  return value ? new Date(value).toISOString() : null;
}

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    "The operation could not be completed. Please try again."
  );
}

function StatusPill({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    completed: "bg-blue-50 text-blue-700",
    scheduled: "bg-violet-50 text-violet-700",
    paused: "bg-amber-50 text-amber-700",
    rejected: "bg-red-50 text-red-700",
    archived: "bg-slate-100 text-slate-600",
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

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

export default function CampaignManagement({ isAdmin = false }) {
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [placementsChanged, setPlacementsChanged] = useState(false);

  const queryFilters = useMemo(
    () => ({
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      limit: 100,
    }),
    [filters],
  );

  const campaignsQuery = useCampaigns(queryFilters);
  const placementsQuery = useAdPlacements(
    { status: "active", page: 1, pageSize: 50 },
    formOpen,
  );
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  const mutation = editingId ? updateMutation : createMutation;
  const busy = mutation.isPending;

  function openCreate() {
    setEditingId(null);
    setPlacementsChanged(false);
    setForm(initialForm);
    setFormOpen(true);
  }

  function openEdit(campaign) {
    setEditingId(campaign.id);
    setPlacementsChanged(false);
    setForm({
      placement_ids: campaign.placement_ids ?? [],
      name: campaign.name || "",
      campaign_type: campaign.campaign_type || "direct",
      channel: campaign.channel || "display",
      headline: campaign.headline || "",
      description: campaign.description || "",
      image_url: campaign.image_url || "",
      image_alt_text: campaign.image_alt_text || "",
      call_to_action_text: campaign.call_to_action_text || "",
      objective: campaign.objective || "",
      destination_url: campaign.destination_url || "",
      status: campaign.status || "draft",
      starts_at: localDateValue(campaign.starts_at),
      ends_at: localDateValue(campaign.ends_at),
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setPlacementsChanged(false);
    setForm(initialForm);
    createMutation.reset();
    updateMutation.reset();
  }

  function changeField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  function togglePlacement(placementId) {
    setPlacementsChanged(true);
    setForm((current) => ({
      ...current,
      placement_ids: current.placement_ids.includes(placementId)
        ? current.placement_ids.filter((id) => id !== placementId)
        : [...current.placement_ids, placementId],
    }));
  }

  async function submitForm(event) {
    event.preventDefault();

    const payload = {
      ...(!editingId || placementsChanged
        ? { placement_ids: form.placement_ids }
        : {}),
      name: form.name.trim(),
      campaign_type: form.campaign_type,
      channel: form.channel,
      objective: form.objective.trim() || null,
      headline: form.headline.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      image_alt_text: form.image_alt_text.trim() || null,
      call_to_action_text: form.call_to_action_text.trim() || null,
      destination_url: form.destination_url.trim() || null,
      ...(isAdmin || !restrictedStatuses.includes(form.status)
        ? { status: form.status }
        : {}),
      starts_at: datePayload(form.starts_at),
      ends_at: datePayload(form.ends_at),
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
      // Mutation error is displayed below the form.
    }
  }

  async function changeStatus(campaign, status) {
    try {
      await updateMutation.mutateAsync({
        campaignId: campaign.id,
        payload: { status },
      });
    } catch {
      // The query error is shown in the campaign panel.
    }
  }

  const campaigns = campaignsQuery.data?.items ?? [];
  const placements = placementsQuery.data?.items ?? [];
  const formError = mutation.error;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-[#14243d]">
            Campaign management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage network, direct, sponsored, and house campaigns.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203858]"
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
                {editingId ? "Edit campaign" : "Create campaign"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Campaign configuration and scheduling.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close campaign form"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Campaign name">
              <input
                className={inputClass}
                name="name"
                value={form.name}
                onChange={changeField}
                placeholder="e.g. Q1 brand awareness"
                minLength={2}
                maxLength={160}
                required
              />
            </Field>

            <Field label="Campaign type">
              <select
                className={inputClass}
                name="campaign_type"
                value={form.campaign_type}
                onChange={changeField}
              >
                <option value="network">Ad network</option>
                <option value="direct">Direct advertising</option>
                <option value="sponsored">Sponsored</option>
                <option value="house">House campaign</option>
              </select>
            </Field>

            <Field label="Channel">
              <select
                className={inputClass}
                name="channel"
                value={form.channel}
                onChange={changeField}
              >
                <option value="display">Display</option>
                <option value="native">Native</option>
                <option value="sponsored_content">Sponsored content</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                className={inputClass}
                name="status"
                value={form.status}
                onChange={changeField}
              >
                {!isAdmin && restrictedStatuses.includes(form.status) && (
                  <option value={form.status} disabled>
                    {form.status.replaceAll("_", " ")} (existing status)
                  </option>
                )}
                {(isAdmin
                  ? statuses
                  : statuses.filter(
                      (status) => !restrictedStatuses.includes(status),
                    )
                ).map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Start date and time">
              <input
                className={inputClass}
                type="datetime-local"
                name="starts_at"
                value={form.starts_at}
                onChange={changeField}
              />
            </Field>

            <Field label="End date and time">
              <input
                className={inputClass}
                type="datetime-local"
                name="ends_at"
                value={form.ends_at}
                onChange={changeField}
              />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Campaign objective">
                <textarea
                  className={inputClass}
                  name="objective"
                  value={form.objective}
                  onChange={changeField}
                  rows={2}
                  maxLength={500}
                  placeholder="Describe the campaign objective..."
                />
              </Field>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-[#14243d]">
                  Ad placements
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Choose where this campaign can appear. Only active placements
                  are available.
                </p>

                <p className="mt-2 text-xs font-medium text-slate-600">
                  {form.placement_ids.length} placement(s) selected
                </p>

                {placementsQuery.isLoading ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Loading available placements...
                  </p>
                ) : placementsQuery.isError ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Available placements could not be loaded. Please close and
                    reopen the form to retry.
                  </p>
                ) : placements.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
                    No active placements are available. You can create
                    placements in Placement Management.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {placements.map((placement) => (
                      <label
                        key={placement.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-[#c4a16a]"
                      >
                        <input
                          type="checkbox"
                          checked={form.placement_ids.includes(placement.id)}
                          onChange={() => togglePlacement(placement.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#14243d]"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-700">
                            {placement.name}
                          </span>
                          <span className="mt-0.5 block text-xs break-all text-slate-500">
                            {placement.placement_key}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400 capitalize">
                            {placement.position?.replaceAll("_", " ")} ·{" "}
                            {placement.format?.replaceAll("_", " ")}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {editingId &&
                  !placementsChanged &&
                  form.placement_ids.some(
                    (id) =>
                      !placements.some((placement) => placement.id === id),
                  ) && (
                    <p className="mt-3 text-xs text-amber-700">
                      This campaign has existing inactive placements. They will
                      remain assigned unless you change the selection.
                    </p>
                  )}
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <div className="border-t border-slate-200 pt-4 sm:col-span-2 lg:col-span-3">
                <h4 className="text-sm font-semibold text-[#14243d]">
                  Ad creative
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Define the content visitors will see in this advertisement.
                </p>
              </div>

              <Field label="Advertiser headline">
                <input
                  className={inputClass}
                  name="headline"
                  value={form.headline}
                  onChange={changeField}
                  maxLength={160}
                  placeholder="e.g. Discover a better way to invest"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Advertisement description">
                  <textarea
                    className={inputClass}
                    name="description"
                    value={form.description}
                    onChange={changeField}
                    rows={3}
                    maxLength={1000}
                    placeholder="Write a short description of the advertiser's offer..."
                  />
                </Field>
              </div>

              <Field label="Advertisement image URL">
                <input
                  className={inputClass}
                  type="url"
                  name="image_url"
                  value={form.image_url}
                  onChange={changeField}
                  maxLength={2048}
                  placeholder="https://example.com/ad-image.jpg"
                />
              </Field>

              <Field label="Image alt text">
                <input
                  className={inputClass}
                  name="image_alt_text"
                  value={form.image_alt_text}
                  onChange={changeField}
                  maxLength={300}
                  placeholder="Describe the advertisement image"
                />
              </Field>

              <Field label="Call-to-action text">
                <input
                  className={inputClass}
                  name="call_to_action_text"
                  value={form.call_to_action_text}
                  onChange={changeField}
                  maxLength={40}
                  placeholder="e.g. Learn more, Shop now, Get started"
                />
              </Field>

              <Field label="Destination URL">
                <input
                  className={inputClass}
                  type="url"
                  name="destination_url"
                  value={form.destination_url}
                  onChange={changeField}
                  maxLength={2048}
                  placeholder="https://example.com/landing-page"
                />
              </Field>
            </div>
          </div>

          {formError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage(formError)}
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
              {busy
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create campaign"}
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
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Search campaigns..."
          />
        </div>

        <select
          className={`${inputClass} sm:w-52`}
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: event.target.value,
            }))
          }
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {campaignsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage(campaignsQuery.error)}
          <button
            type="button"
            onClick={() => campaignsQuery.refetch()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {campaignsQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
          <Megaphone className="mx-auto text-slate-400" size={28} />
          <h3 className="mt-3 font-semibold text-[#14243d]">
            No campaigns found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first campaign or adjust your search filters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_0.8fr_0.8fr_0.8fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase lg:grid">
            <span>Campaign</span>
            <span>Type</span>
            <span>Channel</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_0.8fr_0.8fr_0.8fr_auto] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[#14243d]">
                    {campaign.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Updated{" "}
                    {campaign.updated_at
                      ? new Date(campaign.updated_at).toLocaleDateString()
                      : "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {campaign.placement_ids?.length ?? 0} placement(s) assigned
                  </p>
                  {campaign.starts_at && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                      <CalendarClock size={12} />
                      Starts {new Date(campaign.starts_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="text-xs text-slate-600 capitalize">
                  <span className="text-slate-400 lg:hidden">Type: </span>
                  {campaign.campaign_type}
                </div>

                <div className="text-xs text-slate-600 capitalize">
                  <span className="text-slate-400 lg:hidden">Channel: </span>
                  {campaign.channel?.replaceAll("_", " ")}
                </div>

                <div>
                  <StatusPill status={campaign.status} />
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => openEdit(campaign)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>

                  <select
                    aria-label={`Change status for ${campaign.name}`}
                    className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600"
                    value={campaign.status}
                    disabled={updateMutation.isPending}
                    onChange={(event) =>
                      changeStatus(campaign, event.target.value)
                    }
                  >
                    {!isAdmin &&
                      restrictedStatuses.includes(campaign.status) && (
                        <option value={campaign.status} disabled>
                          {campaign.status.replaceAll("_", " ")} (current)
                        </option>
                      )}
                    {(isAdmin
                      ? statuses
                      : statuses.filter(
                          (status) => !restrictedStatuses.includes(status),
                        )
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            Showing {campaigns.length} of {campaignsQuery.data?.total ?? 0}{" "}
            campaigns
          </div>
        </div>
      )}
    </div>
  );
}
