"use client";

import { useState } from "react";
import { Globe2, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";

import {
  useAdvertisingNetworks,
  useCreateAdvertisingNetwork,
  useUpdateAdvertisingNetwork,
} from "@/features/advertising/queries/advertising.queries";

const networkStatuses = [
  "not_configured",
  "pending",
  "connected",
  "paused",
  "disconnected",
  "error",
];

const initialForm = {
  provider: "google_adsense",
  account_label: "",
  external_account_id: "",
  publisher_id: "",
  status: "not_configured",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#c4a16a] focus:ring-2 focus:ring-[#c4a16a]/15";

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    "The operation could not be completed. Please try again."
  );
}

function NetworkStatus({ status }) {
  const styles = {
    connected: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
    paused: "bg-slate-100 text-slate-600",
    disconnected: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-blue-50 text-blue-700"
      }`}
    >
      {status?.replaceAll("_", " ")}
    </span>
  );
}

export default function NetworkManagement() {
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filters = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const networksQuery = useAdvertisingNetworks(filters);
  const createMutation = useCreateAdvertisingNetwork();
  const updateMutation = useUpdateAdvertisingNetwork();

  const mutation = editingId ? updateMutation : createMutation;

  function openCreate() {
    setEditingId(null);
    setForm(initialForm);
    setFormOpen(true);
    createMutation.reset();
    updateMutation.reset();
  }

  function openEdit(network) {
    setEditingId(network.id);
    setForm({
      provider: network.provider || "other",
      account_label: network.account_label || "",
      external_account_id: network.external_account_id || "",
      publisher_id: network.publisher_id || "",
      status: network.status || "not_configured",
      notes: network.notes || "",
    });
    setFormOpen(true);
    createMutation.reset();
    updateMutation.reset();
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
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

  async function submitForm(event) {
    event.preventDefault();

    const payload = {
      provider: form.provider.trim(),
      account_label: form.account_label.trim(),
      external_account_id: form.external_account_id.trim() || null,
      publisher_id: form.publisher_id.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          networkId: editingId,
          payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      closeForm();
    } catch {
      // Mutation error is displayed in the form.
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-[#14243d]">
            Advertising network accounts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Register and manage external advertising network accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#14243d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203858]"
        >
          <Plus size={16} />
          Add network account
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#e8dfce] bg-[#faf8f3] p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#a17b43]" size={19} />
        <div>
          <p className="text-sm font-semibold text-[#14243d]">
            Secure provider configuration
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Store account identifiers and operational metadata here only.
            Provider API keys, OAuth tokens, and other secrets must remain in
            server-side environment variables or a dedicated secret store.
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
                {editingId
                  ? "Edit network account"
                  : "Register network account"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Provider details and account configuration.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close network form"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Provider identifier
              </span>
              <input
                className={inputClass}
                name="provider"
                value={form.provider}
                onChange={changeField}
                placeholder="google_adsense"
                minLength={2}
                maxLength={80}
                required
              />
              <span className="block text-[11px] text-slate-400">
                Example: google_adsense, media_net, ezoic.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Account label
              </span>
              <input
                className={inputClass}
                name="account_label"
                value={form.account_label}
                onChange={changeField}
                placeholder="Main website account"
                minLength={2}
                maxLength={120}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Connection status
              </span>
              <select
                className={inputClass}
                name="status"
                value={form.status}
                onChange={changeField}
              >
                {networkStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                External account ID
              </span>
              <input
                className={inputClass}
                name="external_account_id"
                value={form.external_account_id}
                onChange={changeField}
                maxLength={160}
                placeholder="Provider account ID"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-600">
                Publisher ID
              </span>
              <input
                className={inputClass}
                name="publisher_id"
                value={form.publisher_id}
                onChange={changeField}
                maxLength={160}
                placeholder="Publisher identifier"
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
                placeholder="Configuration notes, verification details, and operational context..."
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
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Register account"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className={`${inputClass} flex-1`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search provider, account, or ID..."
        />

        <select
          className={`${inputClass} sm:w-52`}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {networkStatuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => networksQuery.refetch()}
          disabled={networksQuery.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={15}
            className={networksQuery.isFetching ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {networksQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage(networksQuery.error)}
          <button
            type="button"
            onClick={() => networksQuery.refetch()}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {networksQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (networksQuery.data?.items ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
          <Globe2 className="mx-auto text-slate-400" size={28} />
          <h3 className="mt-3 font-semibold text-[#14243d]">
            No network accounts registered
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Register Google AdSense or another advertising provider to begin.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.8fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase lg:grid">
            <span>Provider / Account</span>
            <span>External account ID</span>
            <span>Publisher ID</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-slate-100">
            {networksQuery.data.items.map((network) => (
              <article
                key={network.id}
                className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.8fr_auto] lg:items-center lg:gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#14243d]">
                    {network.account_label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {network.provider}
                  </p>
                  {network.notes && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {network.notes}
                    </p>
                  )}
                </div>

                <p className="text-xs break-all text-slate-600">
                  <span className="text-slate-400 lg:hidden">Account ID: </span>
                  {network.external_account_id || "Not provided"}
                </p>

                <p className="text-xs break-all text-slate-600">
                  <span className="text-slate-400 lg:hidden">
                    Publisher ID:{" "}
                  </span>
                  {network.publisher_id || "Not provided"}
                </p>

                <div>
                  <NetworkStatus status={network.status} />
                  {network.last_synced_at && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Last synced{" "}
                      {new Date(network.last_synced_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="lg:text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(network)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Edit account
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
            {networksQuery.data.total} registered network account(s)
          </div>
        </div>
      )}

      <p className="text-xs leading-5 text-slate-400">
        A “Connected” status represents administrator-verified account
        configuration. Live provider authentication, ad serving, and reporting
        integrations are separate implementation steps.
      </p>
    </div>
  );
}
