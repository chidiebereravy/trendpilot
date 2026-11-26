"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Search,
  XCircle,
} from "lucide-react";

import { useReviewAuthorApplication } from "@/features/users/mutations/author-application.mutations";
import { useAdminAuthorApplications } from "@/features/users/queries/author-application.queries";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const statuses = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All applications" },
];

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function StatusLabel({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${styles[status] || "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}

function ReviewDialog({ application, onClose, onSubmit, isPending, error }) {
  const [decision, setDecision] = useState("approved");
  const [reviewNote, setReviewNote] = useState("");

  if (!application) return null;

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      decision,
      reviewNote,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101d30]/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="author-review-title"
        className="my-auto w-full max-w-lg rounded-sm bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#e8e9ed] px-6 py-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Application decision
            </p>
            <h2
              id="author-review-title"
              className="mt-2 text-xl font-bold text-[#14243d]"
            >
              Review author application
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {application.display_name || application.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close review dialog"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <XCircle size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div>
            <label
              htmlFor="author-review-decision"
              className="text-xs font-semibold text-[#344054]"
            >
              Decision
            </label>
            <select
              id="author-review-decision"
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
              disabled={isPending}
              className="mt-2 h-11 w-full rounded-md border border-[#dfe2e8] bg-white px-3 text-sm text-[#172033] outline-none focus:border-[#b99658]"
            >
              <option value="approved">Approve application</option>
              <option value="rejected">Reject application</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="author-review-note"
              className="text-xs font-semibold text-[#344054]"
            >
              Review note
              <span className="ml-2 font-normal text-gray-400">Optional</span>
            </label>
            <textarea
              id="author-review-note"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              maxLength={2000}
              rows={4}
              disabled={isPending}
              placeholder="Add feedback or an internal review note..."
              className="mt-2 w-full rounded-md border border-[#dfe2e8] px-3 py-3 text-sm leading-6 text-[#172033] outline-none focus:border-[#b99658]"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e8e9ed] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-[#dfe2e8] px-5 py-2.5 text-sm font-semibold text-[#344054] hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#203653] disabled:opacity-50"
            >
              {isPending && <LoaderCircle size={15} className="animate-spin" />}
              Confirm decision
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ApplicationSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-48 rounded-xl border border-[#e8e9ed] bg-white"
        />
      ))}
    </div>
  );
}

export default function AuthorApplicationsManager() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [offset, setOffset] = useState(0);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [actionError, setActionError] = useState("");

  const filters = useMemo(
    () => ({
      status,
      search: search || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [status, search, offset],
  );

  const applicationsQuery = useAdminAuthorApplications(filters);
  const reviewMutation = useReviewAuthorApplication();

  const applications = applicationsQuery.data?.applications ?? [];
  const pagination = applicationsQuery.data?.pagination;

  function applySearch(event) {
    event.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function changeStatus(value) {
    setStatus(value);
    setOffset(0);
  }

  function closeReview() {
    if (reviewMutation.isPending) return;
    setSelectedApplication(null);
    setActionError("");
  }

  async function submitReview(payload) {
    if (!selectedApplication) return;

    setActionError("");

    try {
      await reviewMutation.mutateAsync({
        applicationId: selectedApplication.application_id,
        ...payload,
      });

      setSelectedApplication(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  return (
    <div className="container-main py-8 pb-16 sm:py-12">
      <div>
        <p className="text-xs font-bold tracking-[0.2em] text-[#b99658] uppercase">
          Administration workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
          Author applications
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Review writing applications and decide who can contribute content to
          TrendPilot.
        </p>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e8e9ed] bg-white shadow-sm">
        <div className="border-b border-[#e8e9ed] p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#172033]">
                Submitted applications
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review applicant details and manage application decisions.
              </p>
            </div>

            <form
              onSubmit={applySearch}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <label className="relative block flex-1">
                <span className="sr-only">Search applications</span>
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  maxLength={100}
                  placeholder="Search by applicant name or email..."
                  className="h-11 w-full rounded-md border border-[#e3e5e9] pr-3 pl-10 text-sm outline-none focus:border-[#b99658]"
                />
              </label>

              <label>
                <span className="sr-only">Filter applications by status</span>
                <select
                  value={status}
                  onChange={(event) => changeStatus(event.target.value)}
                  className="h-11 w-full rounded-md border border-[#e3e5e9] bg-white px-3 text-sm text-[#26354a] outline-none focus:border-[#b99658] sm:min-w-[190px]"
                >
                  {statuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 text-sm font-semibold text-white hover:bg-[#203653]"
              >
                <Search size={15} />
                Search
              </button>
            </form>
          </div>
        </div>

        {applicationsQuery.isPending ? (
          <div className="p-5 sm:p-6">
            <ApplicationSkeleton />
          </div>
        ) : applicationsQuery.isError ? (
          <div className="p-6">
            <div className="rounded-lg border border-red-100 bg-red-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertCircle size={17} />
                Could not load author applications.
              </div>
              <p className="mt-2 text-sm text-red-700">
                {getErrorMessage(applicationsQuery.error)}
              </p>
              <button
                type="button"
                onClick={() => applicationsQuery.refetch()}
                className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          </div>
        ) : applications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <CheckCircle2 size={26} className="mx-auto text-[#98743d]" />
            <h3 className="mt-4 text-lg font-semibold text-[#172033]">
              No applications found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              There are no applications matching the selected filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#eef0f2]">
            {applications.map((application) => (
              <article key={application.application_id} className="p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-[#172033]">
                      {application.display_name || "Unnamed applicant"}
                    </h3>
                    <p className="mt-1 text-xs break-all text-gray-500">
                      {application.email}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Submitted {formatDate(application.submitted_at) || "—"}
                    </p>
                  </div>

                  <StatusLabel status={application.application_status} />
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div>
                    <h4 className="text-xs font-bold tracking-wide text-[#344054] uppercase">
                      Motivation
                    </h4>
                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-gray-600">
                      {application.motivation}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold tracking-wide text-[#344054] uppercase">
                      Experience
                    </h4>
                    <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-gray-600">
                      {application.experience}
                    </p>
                  </div>
                </div>

                {application.portfolio_url && (
                  <a
                    href={application.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#98743d] hover:text-[#14243d]"
                  >
                    View portfolio
                    <ExternalLink size={13} />
                  </a>
                )}

                {application.review_note && (
                  <div className="mt-4 rounded-md bg-[#f7f8fa] p-3">
                    <p className="text-[10px] font-bold tracking-wide text-gray-500 uppercase">
                      Review note
                    </p>
                    <p className="mt-1 text-sm leading-5 whitespace-pre-wrap text-gray-600">
                      {application.review_note}
                    </p>
                  </div>
                )}

                {application.application_status === "pending" && (
                  <div className="mt-5 flex justify-end border-t border-[#eef0f2] pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError("");
                        setSelectedApplication(application);
                      }}
                      className="inline-flex items-center gap-2 rounded-md bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#203653]"
                    >
                      Review application
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {!applicationsQuery.isPending && !applicationsQuery.isError && (
          <div className="flex flex-col gap-3 border-t border-[#e8e9ed] bg-[#fcfcfb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-gray-500">
              Page {Math.floor(offset / PAGE_SIZE) + 1}
              {pagination?.hasMore ? " · More applications available" : ""}
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setOffset((value) => Math.max(0, value - PAGE_SIZE))
                }
                disabled={offset === 0 || applicationsQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-[#dfe2e8] bg-white px-3 py-2 text-xs font-semibold text-[#344054] hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <button
                type="button"
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
                disabled={!pagination?.hasMore || applicationsQuery.isFetching}
                className="inline-flex items-center gap-1 rounded-md border border-[#dfe2e8] bg-white px-3 py-2 text-xs font-semibold text-[#344054] hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedApplication && (
        <ReviewDialog
          application={selectedApplication}
          onClose={closeReview}
          onSubmit={submitReview}
          isPending={reviewMutation.isPending}
          error={actionError}
        />
      )}
    </div>
  );
}
