import { NextResponse } from "next/server";

import { reportFiltersSchema } from "@/features/reports/schemas/report.schema";
import {
  buildReportPage,
  createCsv,
  decodeReportCursor,
} from "@/features/reports/utils/report-pagination";
import { AuthError, requireRole } from "@/lib/auth/session";
import { handleApiError, successResponse } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EXPORT_LIMIT = 1000;

const REPORT_CONFIG = {
  articles: {
    table: "articles",
    fields:
      "id, title, slug, status, author_id, category_id, created_at, published_at, updated_at",
    csvColumns: [
      "id",
      "title",
      "slug",
      "status",
      "author_id",
      "category_id",
      "created_at",
      "published_at",
      "updated_at",
    ],
  },
  users: {
    table: "profiles",
    fields: "id, display_name, role, created_at, updated_at",
    csvColumns: ["id", "display_name", "role", "created_at", "updated_at"],
  },
  discussions: {
    table: "comments",
    fields:
      "id, article_id, author_id, author_display_name, content, created_at, updated_at, deleted_at, article:articles!inner(title, slug)",
    csvColumns: [
      "id",
      "article_id",
      "article_title",
      "article_slug",
      "author_id",
      "author_display_name",
      "content",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
  },
  categories: {
    table: "categories",
    fields:
      "id, parent_id, name, slug, level, status, display_order, created_at, updated_at",
    csvColumns: [
      "id",
      "parent_id",
      "name",
      "slug",
      "level",
      "status",
      "display_order",
      "created_at",
      "updated_at",
    ],
  },
};

function escapeSearch(value) {
  return value
    .replace(/[\\%_]/g, "\\$&")
    .replace(/[(),]/g, " ")
    .trim();
}

function getDateBoundary(value, addDay = false) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new AuthError(
      "A supplied date filter is not a valid calendar date.",
      400,
      "INVALID_REPORT_DATE",
    );
  }

  if (addDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString();
}

function serializeRecord(type, record) {
  if (type === "discussions") {
    const isDeleted = Boolean(record.deleted_at);

    return {
      ...record,
      article_title: record.article?.title ?? "",
      article_slug: record.article?.slug ?? "",
      content: isDeleted ? null : record.content,
      article: undefined,
    };
  }

  return record;
}

function createCsvResponse(type, records, truncated) {
  const config = REPORT_CONFIG[type];
  const rows = records.map((record) => {
    const serialized = serializeRecord(type, record);

    return Object.fromEntries(
      config.csvColumns.map((column) => [column, serialized[column] ?? ""]),
    );
  });

  const csv = createCsv(config.csvColumns, rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trendpilot-${type}-report-${date}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Report-Export-Limit": String(EXPORT_LIMIT),
      "X-Report-Exported-Count": String(records.length),
      "X-Report-Truncated": String(truncated),
    },
  });
}

export async function GET(request) {
  try {
    const { supabase, profile } = await requireRole(["admin", "editor"]);

    const url = new URL(request.url);
    const filterResult = reportFiltersSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );

    if (!filterResult.success) {
      throw filterResult.error;
    }

    const filters = filterResult.data;
    const { type } = filters;

    if (["users", "categories"].includes(type) && profile.role !== "admin") {
      throw new AuthError(
        "Only administrators can access this report.",
        403,
        "REPORT_PERMISSION_DENIED",
      );
    }

    const cursor = decodeReportCursor(filters.cursor);

    if (filters.cursor && !cursor) {
      throw new AuthError(
        "The report pagination cursor is invalid.",
        400,
        "INVALID_REPORT_CURSOR",
      );
    }

    // Discussions require elevated read access to include comments
    // attached to unpublished articles. Authorization is checked above.
    const database = ["users", "categories", "discussions"].includes(type)
      ? createSupabaseAdminClient()
      : supabase;

    const config = REPORT_CONFIG[type];

    let query = database
      .from(config.table)
      .select(config.fields)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    const searchClauses = [];

    if (filters.search) {
      const search = escapeSearch(filters.search);

      if (search) {
        const pattern = `%${search}%`;

        if (type === "articles") {
          searchClauses.push(`title.ilike.${pattern}`, `slug.ilike.${pattern}`);
        } else if (type === "users") {
          query = query.ilike("display_name", pattern);
        } else if (type === "discussions") {
          searchClauses.push(
            `content.ilike.${pattern}`,
            `author_display_name.ilike.${pattern}`,
          );
        } else if (type === "categories") {
          searchClauses.push(`name.ilike.${pattern}`, `slug.ilike.${pattern}`);
        }
      }
    }
    if (filters.status && type !== "discussions") {
      query = query.eq("status", filters.status);
    }

    if (type === "users" && filters.role) {
      query = query.eq("role", filters.role);
    }

    if (type === "categories" && filters.level) {
      query = query.eq("level", filters.level);
    }

    if (type === "discussions") {
      if (filters.status === "deleted") {
        query = query.not("deleted_at", "is", null);
      } else if (!filters.includeDeleted) {
        query = query.is("deleted_at", null);
      }
    }

    const dateFrom = getDateBoundary(filters.dateFrom);
    const dateTo = getDateBoundary(filters.dateTo, true);

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lt("created_at", dateTo);
    }

    const cursorBranches = cursor
      ? [
          `created_at.lt.${cursor.createdAt}`,
          `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        ]
      : [];

    if (searchClauses.length && cursor) {
      const combinedBranches = searchClauses.flatMap((searchClause) =>
        cursorBranches.map(
          (cursorBranch) => `and(${searchClause},${cursorBranch})`,
        ),
      );

      query = query.or(combinedBranches.join(","));
    } else if (searchClauses.length) {
      query = query.or(searchClauses.join(","));
    } else if (cursor) {
      query = query.or(cursorBranches.join(","));
    }

    if (filters.format === "csv") {
      const { data, error } = await query.limit(EXPORT_LIMIT + 1);

      if (error) throw error;

      const records = data ?? [];
      const truncated = records.length > EXPORT_LIMIT;

      return createCsvResponse(type, records.slice(0, EXPORT_LIMIT), truncated);
    }

    const { data, error } = await query.limit(filters.limit + 1);

    if (error) throw error;

    const page = buildReportPage(data ?? [], filters.limit);

    return successResponse({
      type,
      items: page.items.map((record) => serializeRecord(type, record)),
      pagination: page.pagination,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
