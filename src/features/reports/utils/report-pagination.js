import { reportCursorSchema } from "@/features/reports/schemas/report.schema";

export function encodeReportCursor(record) {
  if (!record?.created_at || !record?.id) return null;

  return Buffer.from(
    JSON.stringify({
      createdAt: record.created_at,
      id: record.id,
    }),
  ).toString("base64url");
}

export function decodeReportCursor(value) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

    const result = reportCursorSchema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function buildReportPage(records, limit) {
  const hasMore = records.length > limit;
  const items = records.slice(0, limit);

  return {
    items,
    pagination: {
      hasMore,
      nextCursor: hasMore ? encodeReportCursor(items[items.length - 1]) : null,
    },
  };
}

export function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";

  let text = String(value);

  // Prevent spreadsheet formula injection.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function createCsv(columns, rows) {
  const header = columns.map(escapeCsvValue).join(",");

  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column])).join(","),
  );

  return [header, ...body].join("\r\n");
}
