"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  FileText,
  ShieldCheck,
  UserRound,
  Megaphone,
  Settings2,
  AlertCircle,
  Trash2,
  ExternalLink,
  LoaderCircle,
  Inbox,
  RefreshCw,
} from "lucide-react";

import {
  useDeleteNotification,
  useMarkAllNotificationsAsRead,
  useUpdateNotification,
} from "@/features/notifications/mutations/notification.mutations";
import { useDashboardNotifications } from "@/features/notifications/queries/notification.queries";

const FILTERS = [
  { value: "all", label: "All notifications" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const TYPE_PRESENTATION = {
  system: {
    label: "System",
    icon: Settings2,
    className: "bg-slate-100 text-slate-600",
  },
  article: {
    label: "Article",
    icon: FileText,
    className: "bg-blue-50 text-blue-700",
  },
  comment: {
    label: "Comment",
    icon: MessageSquare,
    className: "bg-violet-50 text-violet-700",
  },
  moderation: {
    label: "Moderation",
    icon: ShieldCheck,
    className: "bg-amber-50 text-amber-700",
  },
  account: {
    label: "Account",
    icon: UserRound,
    className: "bg-cyan-50 text-cyan-700",
  },
  security: {
    label: "Security",
    icon: ShieldCheck,
    className: "bg-red-50 text-red-700",
  },
  announcement: {
    label: "Announcement",
    icon: Megaphone,
    className: "bg-[#f5f1e9] text-[#a17b43]",
  },
};

function formatNotificationDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const difference = now.getTime() - date.getTime();

  if (difference >= 0 && difference < 60_000) {
    return "Just now";
  }

  if (difference >= 0 && difference < 60 * 60_000) {
    const minutes = Math.floor(difference / 60_000);
    return `${minutes}m ago`;
  }

  if (difference >= 0 && difference < 24 * 60 * 60_000) {
    const hours = Math.floor(difference / (60 * 60_000));
    return `${hours}h ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getTypePresentation(type) {
  return (
    TYPE_PRESENTATION[type] || {
      label: "Notification",
      icon: Bell,
      className: "bg-slate-100 text-slate-600",
    }
  );
}

function NotificationCard({
  notification,
  onToggleRead,
  onDelete,
  updating,
  deleting,
}) {
  const presentation = getTypePresentation(notification.type);
  const Icon = presentation.icon;

  return (
    <article
      className={[
        "group relative flex gap-3 border-b border-slate-100 px-4 py-5 transition sm:gap-4 sm:px-6",
        notification.isRead ? "bg-white" : "bg-[#fcfbf8]",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          presentation.className,
        ].join(" ")}
        aria-hidden="true"
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            {presentation.label}
          </span>

          {!notification.isRead && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#c4a16a]" />
          )}

          <time
            dateTime={notification.createdAt}
            className="text-[10px] text-slate-400"
          >
            {formatNotificationDate(notification.createdAt)}
          </time>
        </div>

        <h3
          className={[
            "mt-1.5 text-sm text-[#14243d]",
            notification.isRead ? "font-semibold" : "font-bold",
          ].join(" ")}
        >
          {notification.title}
        </h3>

        <p className="mt-1.5 text-xs leading-5 whitespace-pre-wrap text-slate-600">
          {notification.message}
        </p>

        {notification.actionUrl && (
          <Link
            href={notification.actionUrl}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#a17b43] transition hover:text-[#14243d]"
          >
            View details
            <ExternalLink size={12} />
          </Link>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleRead(notification)}
            disabled={updating}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 transition hover:border-[#c4a16a] hover:bg-[#f5f1e9] hover:text-[#14243d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : notification.isRead ? (
              <Bell size={13} />
            ) : (
              <Check size={13} />
            )}

            {notification.isRead ? "Mark unread" : "Mark as read"}
          </button>

          <button
            type="button"
            onClick={() => onDelete(notification.id)}
            disabled={deleting}
            aria-label={`Delete notification: ${notification.title}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

export default function NotificationsPageClient() {
  const [status, setStatus] = useState("all");
  const [feedback, setFeedback] = useState(null);

  const filters = useMemo(() => ({ status, limit: 20 }), [status]);

  const notificationsQuery = useDashboardNotifications(filters);
  const updateMutation = useUpdateNotification();
  const markAllMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();

  const pages = notificationsQuery.data?.pages ?? [];
  const notifications = pages.flatMap((page) => page.items);
  const unreadCount = pages[0]?.unreadCount ?? 0;

  function handleToggleRead(notification) {
    setFeedback(null);

    updateMutation.mutate(
      {
        notificationId: notification.id,
        read: !notification.isRead,
      },
      {
        onError: () => {
          setFeedback({
            type: "error",
            message: "We couldn't update this notification. Please try again.",
          });
        },
      },
    );
  }

  function handleDelete(notificationId) {
    setFeedback(null);

    deleteMutation.mutate(notificationId, {
      onSuccess: () => {
        setFeedback({
          type: "success",
          message: "Notification deleted.",
        });
      },
      onError: () => {
        setFeedback({
          type: "error",
          message: "We couldn't delete this notification. Please try again.",
        });
      },
    });
  }

  function handleMarkAllRead() {
    setFeedback(null);

    markAllMutation.mutate(undefined, {
      onSuccess: (result) => {
        setFeedback({
          type: "success",
          message:
            result.updatedCount > 0
              ? `${result.updatedCount} notification${result.updatedCount === 1 ? "" : "s"} marked as read.`
              : "You're all caught up.",
        });
      },
      onError: () => {
        setFeedback({
          type: "error",
          message: "We couldn't update your notifications. Please try again.",
        });
      },
    });
  }

  const isInitialLoading =
    notificationsQuery.isPending && !notificationsQuery.data;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f1e9] text-[#a17b43]">
              <Bell size={20} />
            </span>

            <div>
              <h2 className="text-base font-bold text-[#14243d]">
                Your notifications
              </h2>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                Stay informed about activity, updates, and important events
                across your TrendPilot workspace.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-xl border border-slate-200 px-3 py-2">
              <p className="text-[10px] font-medium text-slate-400">Unread</p>
              <p className="mt-0.5 text-lg font-bold text-[#14243d] tabular-nums">
                {unreadCount}
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markAllMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#14243d] px-3 text-xs font-semibold text-white transition hover:bg-[#203858] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {markAllMutation.isPending ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={15} />
              )}
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Mark all</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div
            role="tablist"
            aria-label="Filter notifications"
            className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1"
          >
            {FILTERS.map((filter) => {
              const active = status === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setStatus(filter.value);
                    setFeedback(null);
                  }}
                  className={[
                    "rounded-lg px-3 py-2 text-[11px] font-semibold transition",
                    active
                      ? "bg-white text-[#14243d] shadow-sm"
                      : "text-slate-500 hover:text-[#14243d]",
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#14243d] disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={notificationsQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className={[
              "mx-4 mb-3 rounded-xl px-3 py-2.5 text-xs sm:mx-6",
              feedback.type === "error"
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {feedback.message}
          </div>
        )}

        {isInitialLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <LoaderCircle size={25} className="animate-spin text-[#a17b43]" />
            <p className="text-xs text-slate-500">
              Loading your notifications...
            </p>
          </div>
        ) : notificationsQuery.isError && !notificationsQuery.data ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertCircle size={20} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-[#14243d]">
              Notifications couldn&apos;t be loaded
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              Something went wrong while retrieving your notifications. Please
              try again.
            </p>
            <button
              type="button"
              onClick={() => notificationsQuery.refetch()}
              className="mt-4 rounded-xl bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#203858]"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={22} />
            </span>

            <h3 className="mt-4 text-sm font-bold text-[#14243d]">
              {status === "unread"
                ? "You're all caught up"
                : status === "read"
                  ? "No read notifications"
                  : "No notifications yet"}
            </h3>

            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {status === "unread"
                ? "You don't have any unread notifications right now."
                : status === "read"
                  ? "Notifications you have read will appear here."
                  : "When something important happens in your workspace, you'll find it here."}
            </p>
          </div>
        ) : (
          <>
            <div>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                  updating={
                    updateMutation.isPending &&
                    updateMutation.variables?.notificationId === notification.id
                  }
                  deleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables === notification.id
                  }
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-5">
              {notificationsQuery.hasNextPage && (
                <button
                  type="button"
                  onClick={() => notificationsQuery.fetchNextPage()}
                  disabled={notificationsQuery.isFetchingNextPage}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-[#14243d] transition hover:border-[#c4a16a] hover:bg-[#f5f1e9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {notificationsQuery.isFetchingNextPage && (
                    <LoaderCircle size={14} className="animate-spin" />
                  )}
                  Load more notifications
                </button>
              )}

              <p className="text-[10px] text-slate-400">
                Showing {notifications.length} notification
                {notifications.length === 1 ? "" : "s"}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
