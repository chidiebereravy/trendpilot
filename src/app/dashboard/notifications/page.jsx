import NotificationsPageClient from "@/features/notifications/components/NotificationsPageClient";

export const metadata = {
  title: "Notifications",
  description: "View and manage your TrendPilot workspace notifications.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
