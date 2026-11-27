"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useAdvertisers,
  useCreateAdvertiser,
  useUpdateAdvertiser,
} from "@/features/advertising/queries/advertising.queries";

const statuses = ["prospect", "active", "inactive", "blacklisted"];

const initialForm = {
  company_name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  billing_address: "",
  tax_reference: "",
  notes: "",
  status: "prospect",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    "The operation could not be completed. Please try again."
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700",
    prospect: "bg-blue-50 text-blue-700",
    inactive: "bg-slate-100 text-slate-600",
    blacklisted: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function AdvertiserField({ label, name, value, onChange, ...props }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <input
        className={inputClass}
        name={name}
        value={value}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}

export default function AdvertiserManagement() {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    pageSize,
  };

  const advertisersQuery = useAdvertisers(filters);
  const createMutation = useCreateAdvertiser();
  const updateMutation = useUpdateAdvertiser();
  const mutation = editingId ? updateMutation : createMutation;

  function resetMutations() {
    createMutation.reset();
    updateMutation.reset();
  }

  function openCreate() {
    setEditingId(null);
    setForm(initialForm);
    resetMutations();
    setFormOpen(true);
  }

  function openEdit(advertiser) {
    setEditingId(advertiser.id);
    setForm({
      company_name: advertiser.company_name || "",
      contact_name: advertiser.contact_name || "",
      contact_email: advertiser.contact_email || "",
      contact_phone: advertiser.contact_phone || "",
      website_url: advertiser.website_url || "",
      billing_address: advertiser.billing_address || "",
      tax_reference: advertiser.tax_reference || "",
      notes: advertiser.notes || "",
      status: advertiser.status || "prospect",
    });
    resetMutations();
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(initialForm);
    resetMutations();
  }

  function changeField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function submitForm(event) {
    event.preventDefault();

    const payload = {
      company_name: form.company_name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim().toLowerCase() || null,
      contact_phone: form.contact_phone.trim() || null,
      website_url: form.website_url.trim() || null,
      billing_address: form.billing_address.trim() || null,
      tax_reference: form.tax_reference.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          advertiserId: editingId,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
        setPage(1);
      }

      closeForm();
    } catch {
      // The mutation error is displayed in the form.
    }
  }

  const items = advertisersQuery.data?.items ?? [];
  const total = advertisersQuery.data?.total ?? 0;
  const totalPages = advertisersQuery.data?.totalPages ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-[#14243d]">
            Advertiser directory
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Maintain advertiser profiles, contact information, and account
            standing.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#203858]"
        >
          <Plus size={16} />
          Add advertiser
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#e8dfce] bg-[#faf8f3] p-4">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#a17b43]" />
        <div>
          <p className="text-sm font-semibold text-[#14243d]">
            Confidential advertiser records
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Contact details, billing information, tax references, and internal
            notes are available to administrators only. Blacklisted advertisers
            should not be assigned to new campaigns.
          </p>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={submitForm}
          className="rounded-2xl border border-[#c4a16a]/40 bg-[#fcfbf8] p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#14243d]">
                {editingId ? "Edit advertiser" : "Create advertiser profile"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Company, contact, and account information.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close advertiser form"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdvertiserField
              label="Company name"
              name="company_name"
              value={form.company_name}
              onChange={changeField}
              placeholder="Company or organization"
              minLength={2}
              maxLength={180}
              required
            />

            <AdvertiserField
              label="Contact name"
              name="contact_name"
              value={form.contact_name}
              onChange={changeField}
              placeholder="Primary contact"
              maxLength={120}
            />

            <AdvertiserField
              label="Contact email"
              name="contact_email"
              value={form.contact_email}
              onChange={changeField}
              placeholder="contact@example.com"
              type="email"
              maxLength={254}
            />

            <AdvertiserField
              label="Contact phone"
              name="contact_phone"
              value={form.contact_phone}
              onChange={changeField}
              placeholder="Phone number"
              maxLength={40}
            />

            <AdvertiserField
              label="Website URL"
              name="website_url"
              value={form.website_url}
              onChange={changeField}
              placeholder="https://example.com"
              type="url"
              maxLength={2048}
            />

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Account status
              </span>
              <select
                className={inputClass}
                name="status"
                value={form.status}
                onChange={changeField}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <AdvertiserField
              label="Tax reference"
              name="tax_reference"
              value={form.tax_reference}
              onChange={changeField}
              placeholder="Optional tax identifier"
              maxLength={120}
            />

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-600">
                Billing address
              </span>
              <textarea
                className={inputClass}
                name="billing_address"
                value={form.billing_address}
                onChange={changeField}
                rows={2}
                maxLength={1000}
                placeholder="Billing address and invoicing details..."
              />
            </label>

            <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-600">
                Internal notes
              </span>
              <textarea
                className={inputClass}
                name="notes"
                value={form.notes}
                onChange={changeField}
                rows={3}
                maxLength={2000}
                placeholder="Relationship history, agreements, verification notes..."
              />
            </label>
          </div>

          {mutation.error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage(mutation.error)}
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
              disabled={mutation.isPending}
              className="cursor-pointer rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold !text-white hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create advertiser"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
          />
          <input
            className={`${inputClass} pl-10`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search company, contact, or email..."
          />
        </div>

        <select
          className={`${inputClass} sm:w-48`}
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => advertisersQuery.refetch()}
          disabled={advertisersQuery.isFetching}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={15}
            className={advertisersQuery.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {advertisersQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage(advertisersQuery.error)}
          <button
            type="button"
            onClick={() => advertisersQuery.refetch()}
            className="ml-2 cursor-pointer font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {advertisersQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
          <Building2 size={29} className="mx-auto text-slate-400" />
          <h3 className="mt-3 font-semibold text-[#14243d]">
            No advertisers found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Add an advertiser profile or adjust your search filters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase lg:grid">
            <span>Company</span>
            <span>Contact</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-slate-100">
            {items.map((advertiser) => (
              <article
                key={advertiser.id}
                className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#14243d]">
                    {advertiser.company_name}
                  </p>
                  {advertiser.website_url && (
                    <a
                      href={advertiser.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-xs text-[#a17b43] hover:underline"
                    >
                      {advertiser.website_url}
                    </a>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    Updated{" "}
                    {new Date(advertiser.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-700">
                    {advertiser.contact_name || "No contact name"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {advertiser.contact_email ||
                      advertiser.contact_phone ||
                      "No contact details"}
                  </p>
                </div>

                <div>
                  <StatusBadge status={advertiser.status} />
                </div>

                <div className="lg:text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(advertiser)}
                    className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Edit profile
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-slate-500">
              {total} advertiser{total === 1 ? "" : "s"} · Page {page}
              {totalPages ? ` of ${totalPages}` : ""}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || advertisersQuery.isFetching}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages || advertisersQuery.isFetching}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
