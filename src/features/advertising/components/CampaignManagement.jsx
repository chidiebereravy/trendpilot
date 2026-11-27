"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Edit3,
  ImagePlus,
  Megaphone,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  useCampaigns,
  useAdPlacements,
  useCreateCampaign,
  useUpdateCampaign,
} from "@/features/advertising/queries/advertising.queries";
import { useMedia } from "@/features/media/queries/media.queries";
import Image from "next/image";

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
  image_media_asset_id: "",
  image_media_asset: null,
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
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [imagePage, setImagePage] = useState(1);

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

  const mediaQuery = useMedia(
    {
      purpose: "advertisement",
      status: "published",
      page: imagePage,
      pageSize: 50,
    },
    formOpen || imagePickerOpen,
  );

  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  const mutation = editingId ? updateMutation : createMutation;
  const busy = mutation.isPending;

  function openCreate() {
    setEditingId(null);
    setPlacementsChanged(false);
    setImagePickerOpen(false);
    setImageSearch("");
    setImagePage(1);
    setForm(initialForm);
    setFormOpen(true);
  }

  function openEdit(campaign) {
    setEditingId(campaign.id);
    setPlacementsChanged(false);
    setImagePickerOpen(false);
    setImageSearch("");
    setImagePage(1);

    setForm({
      placement_ids: campaign.placement_ids ?? [],
      name: campaign.name || "",
      campaign_type: campaign.campaign_type || "direct",
      channel: campaign.channel || "display",
      headline: campaign.headline || "",
      description: campaign.description || "",
      image_media_asset_id: campaign.image_media_asset_id || "",
      image_media_asset: campaign.image_media_asset || null,
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
    setImagePickerOpen(false);
    setImageSearch("");
    setImagePage(1);
    setForm(initialForm);
    createMutation.reset();
    updateMutation.reset();
  }

  function changeField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "image_url" && value.trim()
        ? {
            image_media_asset_id: "",
            image_media_asset: null,
          }
        : {}),
    }));
  }

  function selectMediaAsset(asset) {
    setForm((current) => ({
      ...current,
      image_media_asset_id: asset.id,
      image_media_asset: asset,
      image_url: "",
      image_alt_text: asset.alt_text || current.image_alt_text,
    }));

    setImagePickerOpen(false);
  }

  function removeMediaAsset() {
    setForm((current) => ({
      ...current,
      image_media_asset_id: "",
      image_media_asset: null,
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
      image_media_asset_id: form.image_media_asset_id || null,
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
  const mediaItems = mediaQuery.data?.items ?? [];
  const mediaPagination = mediaQuery.data?.pagination;
  const formError = mutation.error;

  const filteredMedia = mediaItems.filter((asset) =>
    asset.original_filename
      ?.toLowerCase()
      .includes(imageSearch.trim().toLowerCase()),
  );

  const selectedMedia = form.image_media_asset;

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
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#203858]"
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
              className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
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
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-[#14243d]">
                  Ad creative
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Define the content visitors will see in this advertisement.
                </p>
              </div>

              <div className="mt-4 space-y-4">
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

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Advertisement image
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Choose a published advertisement image or use an
                        external image URL.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setImagePickerOpen((open) => !open)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#c4a16a]"
                    >
                      <ImagePlus size={14} />
                      Browse media library
                    </button>
                  </div>

                  {form.image_url ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-600">
                        External image URL selected
                      </p>
                      <p className="mt-1 text-xs break-all text-slate-500">
                        {form.image_url}
                      </p>
                    </div>
                  ) : selectedMedia ? (
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <div className="h-28 w-full overflow-hidden rounded-lg bg-slate-100 sm:w-44">
                        {selectedMedia.preview_url ? (
                          <Image
                            src={selectedMedia.preview_url}
                            alt={
                              selectedMedia.alt_text ||
                              selectedMedia.original_filename
                            }
                            height={100}
                            width={100}
                            priority
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            Preview unavailable
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {selectedMedia.original_filename}
                        </p>
                        <p className="mt-1 text-xs text-emerald-700">
                          Published advertisement image
                        </p>
                        <button
                          type="button"
                          onClick={removeMediaAsset}
                          className="mt-3 cursor-pointer text-xs font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove selected image
                        </button>
                      </div>
                    </div>
                  ) : form.image_media_asset_id ? (
                    <p className="mt-3 text-xs text-amber-700">
                      The previously selected image preview is unavailable.
                      Choose another image or remove the selection.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      No advertisement image selected.
                    </p>
                  )}

                  {imagePickerOpen && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <input
                        className={inputClass}
                        value={imageSearch}
                        onChange={(event) => {
                          setImageSearch(event.target.value);
                          setImagePage(1);
                        }}
                        placeholder="Search advertisement images..."
                      />

                      {mediaQuery.isLoading ? (
                        <p className="py-5 text-center text-xs text-slate-400">
                          Loading published advertisement images...
                        </p>
                      ) : mediaQuery.isError ? (
                        <div className="py-4 text-xs text-red-600">
                          {errorMessage(mediaQuery.error)}
                        </div>
                      ) : filteredMedia.length === 0 ? (
                        <div className="py-5 text-center">
                          <p className="text-xs text-slate-500">
                            No published advertisement images found.
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Upload and publish an image with the advertisement
                            purpose in Media Library.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 grid max-h-72 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                          {filteredMedia.map((asset) => (
                            <button
                              type="button"
                              key={asset.id}
                              onClick={() => selectMediaAsset(asset)}
                              className={`cursor-pointer overflow-hidden rounded-lg border text-left transition hover:border-[#c4a16a] ${
                                form.image_media_asset_id === asset.id
                                  ? "border-[#c4a16a] ring-2 ring-[#c4a16a]/20"
                                  : "border-slate-200"
                              }`}
                            >
                              <div className="h-24 bg-slate-100">
                                {asset.preview_url ? (
                                  <Image
                                    src={asset.preview_url}
                                    alt={
                                      asset.alt_text || asset.original_filename
                                    }
                                    height={100}
                                    width={100}
                                    priority
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    No preview
                                  </div>
                                )}
                              </div>
                              {mediaPagination &&
                                mediaPagination.totalPages > 1 && (
                                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setImagePage((page) =>
                                          Math.max(1, page - 1),
                                        )
                                      }
                                      disabled={
                                        imagePage <= 1 || mediaQuery.isFetching
                                      }
                                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#c4a16a] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Previous
                                    </button>

                                    <span className="text-xs text-slate-500">
                                      Page {mediaPagination.page} of{" "}
                                      {mediaPagination.totalPages}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setImagePage((page) =>
                                          Math.min(
                                            mediaPagination.totalPages,
                                            page + 1,
                                          ),
                                        )
                                      }
                                      disabled={
                                        imagePage >=
                                          mediaPagination.totalPages ||
                                        mediaQuery.isFetching
                                      }
                                      className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#c4a16a] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Next
                                    </button>
                                  </div>
                                )}
                              <p className="truncate p-2 text-xs font-medium text-slate-700">
                                {asset.original_filename}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Field label="External advertisement image URL (optional)">
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
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold !text-white hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-60"
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

      {campaignsQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading campaigns...
        </div>
      ) : campaignsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {errorMessage(campaignsQuery.error)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Megaphone className="mx-auto text-slate-300" size={28} />
          <h3 className="mt-3 text-sm font-semibold text-slate-700">
            No campaigns found
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Create a campaign to begin managing your advertising.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-[#14243d]">
                      {campaign.name}
                    </h3>
                    <StatusPill status={campaign.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {campaign.campaign_type.replaceAll("_", " ")} ·{" "}
                    {campaign.channel.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {campaign.starts_at
                      ? new Date(campaign.starts_at).toLocaleString()
                      : "No start date"}
                    {" — "}
                    {campaign.ends_at
                      ? new Date(campaign.ends_at).toLocaleString()
                      : "No end date"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && campaign.status === "pending_review" && (
                    <>
                      <button
                        type="button"
                        onClick={() => changeStatus(campaign, "active")}
                        disabled={updateMutation.isPending}
                        className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold !text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus(campaign, "rejected")}
                        disabled={updateMutation.isPending}
                        className="cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => openEdit(campaign)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#c4a16a]"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {campaignsQuery.data?.total > campaigns.length && (
        <p className="text-center text-xs text-slate-400">
          Showing {campaigns.length} of {campaignsQuery.data.total} campaigns.
        </p>
      )}
    </div>
  );
}
