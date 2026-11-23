"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Images,
  LoaderCircle,
  Pencil,
  Upload,
  X,
} from "lucide-react";

import {
  useArchiveMedia,
  useMedia,
  usePublishMedia,
  useUpdateMediaMetadata,
  useUploadMedia,
} from "@/features/media/hooks/useMedia";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

const statusOptions = [
  { value: "", label: "All media" },
  { value: "staged", label: "Awaiting approval" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const statusStyles = {
  staged: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-gray-100 text-gray-500",
};

const inputClass =
  "mt-2 w-full rounded-sm border border-[#dfe2e8] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10";

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
        statusStyles[status] || statusStyles.staged
      }`}
    >
      {status === "staged" ? "Awaiting approval" : status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="border border-[#e8e9ed] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <Icon size={18} className="text-[#b99658]" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#14243d]">
        {value}
      </p>
    </div>
  );
}

function MediaSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden border border-[#e8e9ed] bg-white"
        >
          <div className="aspect-[4/3] animate-pulse bg-gray-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }) {
  return (
    <div className="border border-red-200 bg-white p-6">
      <p className="text-sm font-semibold text-red-700">
        The media library could not be loaded.
      </p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-sm bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}

function UploadForm({ onUpload, isPending, error }) {
  const [file, setFile] = useState(null);
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!file) return;

    onUpload(
      {
        file,
        altText: altText.trim(),
        caption: caption.trim(),
      },
      {
        onSuccess: () => {
          setFile(null);
          setAltText("");
          setCaption("");

          const input = document.getElementById("media-file");
          if (input) input.value = "";
        },
      },
    );
  }

  return (
    <section className="border border-[#e8e9ed] bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
          <ImagePlus size={19} />
        </div>

        <div>
          <h2 className="text-base font-bold text-[#14243d]">
            Add images to your library
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Upload JPEG, PNG, WebP or AVIF images. Files must be no larger than
            10 MB and will remain private until approved.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <label
            htmlFor="media-file"
            className="flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed border-[#d9dce2] bg-[#fafbfc] p-5 text-center transition hover:border-[#b99658] hover:bg-[#fcfbf8]"
          >
            <Upload size={25} className="text-[#a78348]" />

            <span className="mt-3 text-sm font-semibold text-[#26354a]">
              Choose an image
            </span>

            <span className="mt-1 text-xs text-gray-400">
              Select an image from your device
            </span>

            <span className="mt-3 text-[10px] text-gray-400">
              JPEG · PNG · WebP · AVIF · Max 10 MB
            </span>
          </label>

          <input
            id="media-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          {file && (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-gray-500">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  const input = document.getElementById("media-file");
                  if (input) input.value = "";
                }}
                className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="upload-alt-text"
              className="text-xs font-semibold text-[#344054]"
            >
              Alternative text
            </label>

            <input
              id="upload-alt-text"
              value={altText}
              maxLength={500}
              onChange={(event) => setAltText(event.target.value)}
              className={inputClass}
              placeholder="Describe the image for accessibility"
            />

            <p className="mt-1 text-right text-[10px] text-gray-400">
              {altText.length}/500
            </p>
          </div>

          <div>
            <label
              htmlFor="upload-caption"
              className="text-xs font-semibold text-[#344054]"
            >
              Caption
            </label>

            <textarea
              id="upload-caption"
              rows={3}
              maxLength={1000}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              className={inputClass}
              placeholder="Add an optional image caption"
            />

            <p className="mt-1 text-right text-[10px] text-gray-400">
              {caption.length}/1000
            </p>
          </div>

          {error && (
            <p role="alert" className="text-xs leading-5 text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!file || isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#14243d] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}

            {isPending ? "Uploading image..." : "Upload image"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MetadataDialog({ asset, onClose, onSave, isPending, error }) {
  const [altText, setAltText] = useState(asset.alt_text || "");
  const [caption, setCaption] = useState(asset.caption || "");

  function handleSubmit(event) {
    event.preventDefault();

    onSave({
      mediaId: asset.id,
      altText,
      caption,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101d30]/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-edit-title"
        className="my-auto w-full max-w-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#e8e9ed] px-6 py-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Media library
            </p>
            <h2
              id="media-edit-title"
              className="mt-2 text-xl font-bold text-[#14243d]"
            >
              Edit image details
            </h2>
            <p className="mt-1 max-w-sm truncate text-xs text-gray-500">
              {asset.original_filename}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label
              htmlFor="edit-alt-text"
              className="text-xs font-semibold text-[#344054]"
            >
              Alternative text
            </label>
            <input
              id="edit-alt-text"
              value={altText}
              maxLength={500}
              onChange={(event) => setAltText(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">
              {altText.length}/500
            </p>
          </div>

          <div>
            <label
              htmlFor="edit-caption"
              className="text-xs font-semibold text-[#344054]"
            >
              Caption
            </label>
            <textarea
              id="edit-caption"
              rows={3}
              maxLength={1000}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">
              {caption.length}/1000
            </p>
          </div>

          {error && (
            <p role="alert" className="text-xs leading-5 text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e8e9ed] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#dfe2e8] px-5 py-3 text-xs font-semibold text-[#344054] hover:border-[#b99658]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 bg-[#14243d] px-6 py-3 text-xs font-bold text-white hover:bg-[#203653] disabled:opacity-50"
            >
              {isPending && <LoaderCircle size={14} className="animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MediaCard({
  asset,
  canManage,
  onEdit,
  onPublish,
  onArchive,
  isPublishing,
  isArchiving,
  canEdit,
}) {
  const isArchived = asset.status === "archived";

  return (
    <article className="overflow-hidden border border-[#e8e9ed] bg-white transition hover:shadow-sm">
      <div className="relative aspect-[4/3] bg-[#f3f4f6]">
        {asset.preview_url ? (
          <Image
            src={asset.preview_url}
            alt={asset.alt_text || asset.original_filename}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <Images size={28} />
            <span className="mt-2 text-[10px]">
              {isArchived ? "Archived image" : "Preview unavailable"}
            </span>
          </div>
        )}

        <div className="absolute top-3 left-3">
          <StatusBadge status={asset.status} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3
            className="truncate text-sm font-semibold text-[#172033]"
            title={asset.original_filename}
          >
            {asset.original_filename}
          </h3>
          <p className="mt-1 text-[10px] text-gray-400">
            {asset.mime_type} ·{" "}
            {(asset.file_size_bytes / 1024 / 1024).toFixed(2)} MB
          </p>
          <p className="mt-1 text-[10px] text-gray-400">
            Added {formatDate(asset.created_at)}
          </p>
        </div>

        {asset.alt_text && (
          <p className="line-clamp-2 text-xs leading-5 text-gray-500">
            {asset.alt_text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[#eef0f2] pt-3">
          {canEdit && !isArchived && (
            <button
              type="button"
              onClick={() => onEdit(asset)}
              className="inline-flex items-center gap-1.5 border border-[#e3e5e9] px-3 py-2 text-[10px] font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              <Pencil size={12} />
              Details
            </button>
          )}

          {canManage && asset.status === "staged" && (
            <button
              type="button"
              onClick={() => onPublish(asset)}
              disabled={isPublishing}
              className="inline-flex items-center gap-1.5 bg-[#14243d] px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-[#203653] disabled:opacity-50"
            >
              {isPublishing ? (
                <LoaderCircle size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Approve
            </button>
          )}

          {canManage && !isArchived && (
            <button
              type="button"
              onClick={() => onArchive(asset)}
              disabled={isArchiving}
              className="inline-flex items-center gap-1.5 border border-[#e3e5e9] px-3 py-2 text-[10px] font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            >
              {isArchiving ? (
                <LoaderCircle size={12} className="animate-spin" />
              ) : (
                <Archive size={12} />
              )}
              Archive
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MediaManagement({ role }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editingAsset, setEditingAsset] = useState(null);
  const [actionError, setActionError] = useState("");

  const canManage = role === "editor" || role === "admin";

  const filters = useMemo(
    () => ({
      status: status || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [status, page],
  );

  const mediaQuery = useMedia(filters);
  const uploadMutation = useUploadMedia();
  const updateMutation = useUpdateMediaMetadata();
  const publishMutation = usePublishMedia();
  const archiveMutation = useArchiveMedia();

  const items = mediaQuery.data?.items ?? [];
  const pagination = mediaQuery.data?.pagination;

  const stagedCount = items.filter((item) => item.status === "staged").length;
  const publishedCount = items.filter(
    (item) => item.status === "published",
  ).length;
  const archivedCount = items.filter(
    (item) => item.status === "archived",
  ).length;

  function updateStatus(value) {
    setStatus(value);
    setPage(1);
    setActionError("");
  }

  function handlePublish(asset) {
    const confirmed = window.confirm(
      `Approve "${asset.original_filename}" and move it to public storage?`,
    );

    if (!confirmed) return;

    setActionError("");

    publishMutation.mutate(asset.id, {
      onError: (error) => setActionError(getErrorMessage(error)),
    });
  }

  function handleArchive(asset) {
    const confirmed = window.confirm(
      `Archive "${asset.original_filename}"? This removes the image from public storage if it has been published. Images used by articles cannot be archived.`,
    );

    if (!confirmed) return;

    setActionError("");

    archiveMutation.mutate(asset.id, {
      onError: (error) => setActionError(getErrorMessage(error)),
    });
  }

  function handleSaveMetadata(payload) {
    setActionError("");

    updateMutation.mutate(payload, {
      onSuccess: () => setEditingAsset(null),
      onError: (error) => setActionError(getErrorMessage(error)),
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="border-b border-[#e8e9ed] bg-white">
        <div className="container-main py-8 sm:py-10">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase">
            <Images size={14} />
            Editorial CMS
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#14243d] sm:text-4xl">
            Media library
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
            Store, review and manage the images used across TrendPilot. Uploaded
            images remain private until an editor or administrator approves
            them.
          </p>
        </div>
      </div>

      <div className="container-main space-y-8 py-8 pb-16 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Assets on this page"
            value={pagination?.total ?? 0}
            icon={Images}
          />
          <StatCard
            label="Awaiting approval"
            value={stagedCount}
            icon={ImagePlus}
          />
          <StatCard
            label="Published on this page"
            value={publishedCount}
            icon={Check}
          />
          <StatCard
            label="Archived on this page"
            value={archivedCount}
            icon={Archive}
          />
        </div>

        <UploadForm
          onUpload={uploadMutation.mutate}
          isPending={uploadMutation.isPending}
          error={
            uploadMutation.isError ? getErrorMessage(uploadMutation.error) : ""
          }
        />

        <section className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#14243d]">
                Your image collection
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Browse images and manage their editorial status.
              </p>
            </div>

            <label className="block sm:min-w-52">
              <span className="sr-only">Filter media by status</span>
              <select
                value={status}
                onChange={(event) => updateStatus(event.target.value)}
                className="w-full rounded-sm border border-[#e3e5e9] bg-white px-3 py-3 text-xs text-[#26354a] outline-none focus:border-[#b99658]"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {mediaQuery.isFetching && !mediaQuery.isPending && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <LoaderCircle size={13} className="animate-spin" />
              Updating media library...
            </div>
          )}

          {mediaQuery.isPending && <MediaSkeleton />}

          {mediaQuery.isError && (
            <ErrorPanel
              message={getErrorMessage(mediaQuery.error)}
              onRetry={() => mediaQuery.refetch()}
            />
          )}

          {actionError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError("")}
                aria-label="Dismiss error"
                className="shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {!mediaQuery.isPending &&
            !mediaQuery.isError &&
            items.length === 0 && (
              <div className="border border-[#e8e9ed] bg-white px-6 py-16 text-center">
                <Images size={30} className="mx-auto text-[#b99658]" />
                <h3 className="mt-4 text-sm font-semibold text-[#14243d]">
                  {status
                    ? "No images match this status"
                    : "Your media library is empty"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-gray-500">
                  {status
                    ? "Try another status filter or upload a new image."
                    : "Upload your first image above. It will appear here for editorial review."}
                </p>
              </div>
            )}

          {!mediaQuery.isPending && !mediaQuery.isError && items.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((asset) => (
                  <MediaCard
                    key={asset.id}
                    asset={asset}
                    canManage={canManage}
                    onEdit={setEditingAsset}
                    onPublish={handlePublish}
                    onArchive={handleArchive}
                    isPublishing={
                      publishMutation.isPending &&
                      publishMutation.variables === asset.id
                    }
                    isArchiving={
                      archiveMutation.isPending &&
                      archiveMutation.variables === asset.id
                    }
                    canEdit={
                      canManage ||
                      (role === "author" && asset.status === "staged")
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e8e9ed] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(
                    page * PAGE_SIZE,
                    pagination?.total ?? items.length,
                  )}{" "}
                  of {pagination?.total ?? items.length} images
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="inline-flex items-center gap-1 border border-[#e3e5e9] px-3 py-2 text-xs font-semibold text-[#26354a] hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <span className="min-w-20 text-center text-xs text-gray-500">
                    Page {page} of {Math.max(1, pagination?.totalPages ?? 1)}
                  </span>

                  <button
                    type="button"
                    disabled={page >= (pagination?.totalPages ?? 1)}
                    onClick={() => setPage((current) => current + 1)}
                    className="inline-flex items-center gap-1 border border-[#e3e5e9] px-3 py-2 text-xs font-semibold text-[#26354a] hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {editingAsset && (
        <MetadataDialog
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={handleSaveMetadata}
          isPending={updateMutation.isPending}
          error={
            updateMutation.isError ? getErrorMessage(updateMutation.error) : ""
          }
        />
      )}
    </div>
  );
}
