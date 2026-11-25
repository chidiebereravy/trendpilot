"use client";

import { useMemo, useState } from "react";
import {
  useArticleAffiliatePlacements,
  useSaveArticleAffiliatePlacements,
} from "@/features/affiliate/queries/affiliate.queries";

function getBlockLabel(block, index) {
  const type = block.type
    ? block.type.charAt(0).toUpperCase() + block.type.slice(1)
    : "Content";

  const text = block.text?.trim();

  return {
    title: `${type} ${index + 1}`,
    preview: text || "No text preview available",
  };
}

export default function ArticleAffiliatePlacementEditor({
  articleId,
  blocks = [],
  role,
  articleStatus,
}) {
  const canManage =
    role === "admin" ||
    role === "editor" ||
    (role === "author" && ["draft", "in_review"].includes(articleStatus));

  const placementsQuery = useArticleAffiliatePlacements(articleId, {
    enabled: Boolean(articleId) && canManage,
  });

  const saveMutation = useSaveArticleAffiliatePlacements();

  const [placementOverrides, setPlacementOverrides] = useState(null);

  const data = placementsQuery.data;

  const savedBlocks = useMemo(() => data?.article?.blocks ?? [], [data]);

  const eligibleLinks = useMemo(() => data?.eligibleLinks ?? [], [data]);

  const existingPlacements = useMemo(() => data?.placements ?? [], [data]);

  const initialPlacements = useMemo(
    () =>
      Object.fromEntries(
        existingPlacements.map((placement) => [
          placement.blockId,
          placement.affiliateLinkId,
        ]),
      ),
    [existingPlacements],
  );

  const draftPlacements = placementOverrides ?? initialPlacements;

  const eligibleLinkIds = useMemo(
    () => new Set(eligibleLinks.map((link) => link.id)),
    [eligibleLinks],
  );

  const savedBlockIds = useMemo(
    () =>
      new Set(
        savedBlocks
          .map((block) => block.id)
          .filter((id) => typeof id === "string" && id.length > 0),
      ),
    [savedBlocks],
  );

  const contentStructureChanged = useMemo(() => {
    const currentIds = new Set(
      blocks
        .map((block) => block.id)
        .filter((id) => typeof id === "string" && id.length > 0),
    );

    if (
      blocks.length !== savedBlocks.length ||
      currentIds.size !== blocks.length ||
      savedBlockIds.size !== savedBlocks.length
    ) {
      return true;
    }

    return (
      currentIds.size !== savedBlockIds.size ||
      [...currentIds].some((id) => !savedBlockIds.has(id))
    );
  }, [blocks, savedBlocks, savedBlockIds]);

  const selectedPlacements = useMemo(
    () =>
      Object.entries(draftPlacements)
        .filter(
          ([blockId, affiliateLinkId]) =>
            Boolean(affiliateLinkId) && savedBlockIds.has(blockId),
        )
        .map(([blockId, affiliateLinkId]) => ({
          blockId,
          affiliateLinkId,
        })),
    [draftPlacements, savedBlockIds],
  );

  const hasInvalidSelection = useMemo(
    () =>
      Object.entries(draftPlacements).some(
        ([blockId, affiliateLinkId]) =>
          Boolean(affiliateLinkId) &&
          (!savedBlockIds.has(blockId) ||
            !eligibleLinkIds.has(affiliateLinkId)),
      ),
    [draftPlacements, savedBlockIds, eligibleLinkIds],
  );

  function updatePlacement(blockId, affiliateLinkId) {
    setPlacementOverrides((current) => {
      const next = { ...(current ?? initialPlacements) };

      if (affiliateLinkId) {
        next[blockId] = affiliateLinkId;
      } else {
        delete next[blockId];
      }

      return next;
    });
  }

  function handleSave() {
    saveMutation.mutate({
      articleId,
      placements: selectedPlacements,
    });
  }

  if (!articleId || !canManage) return null;

  return (
    <section className="border border-[#e8e9ed] bg-white p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-[#14243d]">
          Affiliate link placements
        </h2>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          Associate approved affiliate links with specific content blocks.
          Readers will see the links alongside the relevant article content.
        </p>
      </div>

      {placementsQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading affiliate placements...</p>
      ) : placementsQuery.isError ? (
        <p className="text-sm text-red-600">
          {placementsQuery.error?.response?.data?.error?.message ||
            "Unable to load affiliate placements."}
        </p>
      ) : savedBlocks.length === 0 ? (
        <p className="text-sm text-gray-500">
          Add and save article content blocks before assigning affiliate links.
        </p>
      ) : (
        <>
          {eligibleLinks.length === 0 && (
            <div className="mb-4 border border-[#eee4d2] bg-[#faf8f3] p-3 text-xs leading-5 text-[#725b35]">
              There are currently no eligible affiliate links. Create or
              activate an affiliate link and its program before assigning it.
            </div>
          )}

          <div className="space-y-4">
            {savedBlocks.map((block, index) => {
              const label = getBlockLabel(block, index);
              const selectedId = draftPlacements[block.id] ?? "";

              const selectedLink = existingPlacements.find(
                (placement) =>
                  placement.blockId === block.id &&
                  placement.affiliateLinkId === selectedId,
              )?.link;

              return (
                <div
                  key={block.id ?? `block-${index}`}
                  className="border border-[#edf0f2] p-4"
                >
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-[#14243d]">
                      {label.title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {label.preview}
                    </p>
                  </div>

                  <label
                    htmlFor={`affiliate-placement-${block.id ?? index}`}
                    className="mb-1.5 block text-xs font-medium text-[#344054]"
                  >
                    Affiliate link
                  </label>

                  <select
                    id={`affiliate-placement-${block.id ?? index}`}
                    value={selectedId}
                    onChange={(event) =>
                      updatePlacement(block.id, event.target.value)
                    }
                    className="w-full rounded-sm border border-[#dfe2e8] bg-white px-3 py-2.5 text-sm text-[#172033] outline-none focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
                  >
                    <option value="">No affiliate link</option>

                    {selectedId && !eligibleLinkIds.has(selectedId) && (
                      <option value={selectedId}>
                        {selectedLink?.title || "Previously assigned link"} (no
                        longer eligible)
                      </option>
                    )}

                    {eligibleLinks.map((link) => (
                      <option key={link.id} value={link.id}>
                        {link.title}
                        {link.program?.name ? ` — ${link.program.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {contentStructureChanged && (
            <p className="mt-4 border border-[#eee4d2] bg-[#faf8f3] p-3 text-xs leading-5 text-[#725b35]">
              Your article block structure has changed or contains unsaved block
              IDs. Save the article first, then reload this page before saving
              affiliate placements.
            </p>
          )}

          {hasInvalidSelection && (
            <p className="mt-3 text-xs text-red-600">
              Replace or remove affiliate links that are no longer eligible
              before saving.
            </p>
          )}

          {saveMutation.isError && (
            <p className="mt-3 text-xs text-red-600">
              {saveMutation.error?.response?.data?.error?.message ||
                "Unable to save affiliate placements."}
            </p>
          )}

          {saveMutation.isSuccess && (
            <p className="mt-3 text-xs text-green-700">
              Affiliate placements saved successfully.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {selectedPlacements.length}{" "}
              {selectedPlacements.length === 1 ? "placement" : "placements"}{" "}
              selected
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saveMutation.isPending ||
                contentStructureChanged ||
                hasInvalidSelection
              }
              className="rounded-sm bg-[#14243d] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending
                ? "Saving placements..."
                : "Save placements"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
