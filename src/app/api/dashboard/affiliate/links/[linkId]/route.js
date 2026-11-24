import {
  affiliateLinkIdSchema,
  updateAffiliateLinkSchema,
} from "@/features/affiliate/schemas/affiliate-link.schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { assertSameOrigin, readValidatedBody } from "@/lib/api/request";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createNotificationSafely } from "@/features/notifications/services/notification.service";

const LINK_FIELDS = `
  id,
  program_id,
  title,
  description,
  destination_url,
  tracking_code,
  status,
  approved_by,
  approved_at,
  expires_at,
  revision,
  created_by,
  updated_by,
  created_at,
  updated_at,
  program:affiliate_programs (
    id,
    name,
    slug,
    program_type,
    status
  )
`;

const ADMIN_TRANSITIONS = {
  draft: ["pending_review", "archived"],
  pending_review: ["draft", "approved", "archived"],
  approved: ["active", "archived"],
  active: ["paused", "expired", "archived"],
  paused: ["active", "expired", "archived"],
  expired: ["archived"],
  archived: [],
};

function jsonError(message, status, code) {
  return Response.json(
    {
      success: false,
      message,
      error: { code, message },
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

async function getExistingLink(supabase, linkId) {
  const { data, error } = await supabase
    .from("affiliate_links")
    .select("*")
    .eq("id", linkId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function validateProgram(supabase, programId, role) {
  const { data, error } = await supabase
    .from("affiliate_programs")
    .select("id, name, status")
    .eq("id", programId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      error: jsonError(
        "The selected affiliate program does not exist.",
        422,
        "AFFILIATE_PROGRAM_NOT_FOUND",
      ),
    };
  }

  if (role === "editor" && data.status !== "active") {
    return {
      error: jsonError(
        "Editors can only use active affiliate programs.",
        403,
        "AFFILIATE_PROGRAM_NOT_AVAILABLE",
      ),
    };
  }

  if (role === "admin" && data.status === "archived") {
    return {
      error: jsonError(
        "Archived affiliate programs cannot be assigned to links.",
        422,
        "AFFILIATE_PROGRAM_ARCHIVED",
      ),
    };
  }

  return { data };
}

function hasSubstantiveChanges(payload, existing) {
  return (
    (payload.programId !== undefined &&
      payload.programId !== existing.program_id) ||
    (payload.title !== undefined && payload.title !== existing.title) ||
    (payload.description !== undefined &&
      payload.description !== existing.description) ||
    (payload.destinationUrl !== undefined &&
      payload.destinationUrl !== existing.destination_url) ||
    (payload.expiresAt !== undefined &&
      payload.expiresAt !== existing.expires_at)
  );
}

export async function GET(request, { params }) {
  try {
    const {
      user,
      profile: { role },
    } = await requireRole(["admin", "editor"]);

    const { linkId: rawId } = await params;
    const parsedId = affiliateLinkIdSchema.safeParse(rawId);

    if (!parsedId.success) {
      return jsonError(
        "Invalid affiliate link ID.",
        400,
        "INVALID_AFFILIATE_LINK_ID",
      );
    }

    const supabase = createSupabaseAdminClient();
    const existing = await getExistingLink(supabase, parsedId.data);

    if (!existing) {
      return jsonError(
        "Affiliate link not found.",
        404,
        "AFFILIATE_LINK_NOT_FOUND",
      );
    }

    if (role !== "admin" && existing.created_by !== user.id) {
      return jsonError(
        "You do not have permission to view this affiliate link.",
        403,
        "AFFILIATE_LINK_FORBIDDEN",
      );
    }

    const { data, error } = await supabase
      .from("affiliate_links")
      .select(LINK_FIELDS)
      .eq("id", parsedId.data)
      .single();

    if (error) throw error;

    return successResponse({ item: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    assertSameOrigin(request);

    const {
      user,
      profile: { role },
    } = await requireRole(["admin", "editor"]);

    const { linkId: rawId } = await params;
    const parsedId = affiliateLinkIdSchema.safeParse(rawId);

    if (!parsedId.success) {
      return jsonError(
        "Invalid affiliate link ID.",
        400,
        "INVALID_AFFILIATE_LINK_ID",
      );
    }

    const payload = await readValidatedBody(request, updateAffiliateLinkSchema);

    const supabase = createSupabaseAdminClient();

    const existing = await getExistingLink(supabase, parsedId.data);

    if (!existing) {
      return jsonError(
        "Affiliate link not found.",
        404,
        "AFFILIATE_LINK_NOT_FOUND",
      );
    }

    const isAdmin = role === "admin";

    if (!isAdmin && existing.created_by !== user.id) {
      return jsonError(
        "You can only update affiliate links you created.",
        403,
        "AFFILIATE_LINK_FORBIDDEN",
      );
    }

    if (existing.status === "archived") {
      return jsonError(
        "Archived affiliate links cannot be changed.",
        409,
        "AFFILIATE_LINK_ARCHIVED",
      );
    }

    const substantiveChanges = hasSubstantiveChanges(payload, existing);

    const mustReturnToDraft =
      existing.status === "pending_review" && substantiveChanges;

    const requestedStatus = payload.status ?? existing.status;

    const nextStatus = mustReturnToDraft ? "draft" : requestedStatus;

    const nextProgramId = payload.programId ?? existing.program_id;

    const nextExpiry =
      payload.expiresAt !== undefined ? payload.expiresAt : existing.expires_at;

    if (!isAdmin) {
      if (!["draft", "pending_review"].includes(existing.status)) {
        return jsonError(
          "Editors can only update draft or pending-review links.",
          403,
          "AFFILIATE_LINK_EDIT_RESTRICTED",
        );
      }

      if (!["draft", "pending_review"].includes(nextStatus)) {
        return jsonError(
          "Editors cannot approve, activate, pause, expire, or archive links.",
          403,
          "AFFILIATE_LINK_STATUS_RESTRICTED",
        );
      }
    } else {
      const allowedTransitions = ADMIN_TRANSITIONS[existing.status] ?? [];

      if (
        nextStatus !== existing.status &&
        !allowedTransitions.includes(nextStatus)
      ) {
        return jsonError(
          `The transition from ${existing.status} to ${nextStatus} is not allowed.`,
          409,
          "INVALID_AFFILIATE_LINK_TRANSITION",
        );
      }
    }

    if (
      nextExpiry &&
      nextStatus === "active" &&
      new Date(nextExpiry).getTime() <= Date.now()
    ) {
      return jsonError(
        "An active affiliate link must have a future expiry date.",
        422,
        "INVALID_AFFILIATE_LINK_EXPIRY",
      );
    }

    if (payload.programId !== undefined || nextStatus === "active") {
      const programResult = await validateProgram(
        supabase,
        nextProgramId,
        role,
      );

      if (programResult.error) {
        return programResult.error;
      }

      if (nextStatus === "active" && programResult.data.status !== "active") {
        return jsonError(
          "The affiliate program must be active before its links can be activated.",
          409,
          "AFFILIATE_PROGRAM_NOT_ACTIVE",
        );
      }
    }

    if (nextStatus === "approved" && existing.status !== "pending_review") {
      return jsonError(
        "Only links awaiting review can be approved.",
        409,
        "AFFILIATE_LINK_NOT_PENDING_REVIEW",
      );
    }

    const updates = {
      status: nextStatus,
      updated_by: user.id,
    };

    if (payload.programId !== undefined) {
      updates.program_id = payload.programId;
    }

    if (payload.title !== undefined) {
      updates.title = payload.title;
    }

    if (payload.description !== undefined) {
      updates.description = payload.description;
    }

    if (payload.destinationUrl !== undefined) {
      updates.destination_url = payload.destinationUrl;
    }

    if (payload.expiresAt !== undefined) {
      updates.expires_at = payload.expiresAt;
    }

    if (nextStatus === "approved" && existing.status !== "approved") {
      updates.approved_by = user.id;
      updates.approved_at = new Date().toISOString();
    }

    if (["draft", "pending_review"].includes(nextStatus)) {
      updates.approved_by = null;
      updates.approved_at = null;
    }

    // Compare-and-swap: reject an update if the record changed
    // after this request initially read it.
    const { data, error } = await supabase
      .from("affiliate_links")
      .update(updates)
      .eq("id", parsedId.data)
      .eq("revision", existing.revision)
      .select(LINK_FIELDS)
      .maybeSingle();

    if (error?.code === "23505") {
      return jsonError(
        "An affiliate link with conflicting information already exists.",
        409,
        "AFFILIATE_LINK_CONFLICT",
      );
    }

    if (error?.code === "23514") {
      return jsonError(
        error.message ||
          "The affiliate link does not satisfy the required database rules.",
        422,
        "AFFILIATE_LINK_CONSTRAINT",
      );
    }

    if (error?.code === "23503") {
      return jsonError(
        "A referenced affiliate program or profile no longer exists.",
        409,
        "AFFILIATE_LINK_REFERENCE_INVALID",
      );
    }

    if (error) throw error;

    if (!data) {
      return jsonError(
        "This affiliate link was changed by another request. Reload it and try again.",
        409,
        "AFFILIATE_LINK_CONCURRENT_UPDATE",
      );
    }

    // Notify the link creator only after approval succeeds.
    if (
      existing.status === "pending_review" &&
      data.status === "approved" &&
      existing.created_by &&
      existing.created_by !== user.id
    ) {
      await createNotificationSafely({
        userId: existing.created_by,
        actorId: user.id,
        type: "moderation",
        title: "Your affiliate link has been approved",
        message: `Your affiliate link "${data.title}" has been approved and is ready for the next step.`,
        actionUrl: "/dashboard/affiliate-links",
        metadata: {
          event: "affiliate_link_approved",
          affiliateLinkId: data.id,
          affiliateLinkTitle: data.title,
          programId: data.program_id,
          programName: data.program?.name ?? null,
        },
        dedupeKey: `affiliate-link:${data.id}:approved:${data.revision}`,
      });
    }

    const message = mustReturnToDraft
      ? "Changes saved. This link has returned to draft and must be submitted for review again."
      : "Affiliate link updated successfully.";

    return successResponse({ item: data }, 200, message);
  } catch (error) {
    return handleApiError(error);
  }
}
