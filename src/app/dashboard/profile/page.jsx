import ProfilePageClient from "@/features/profile/components/ProfilePageClient";

export const metadata = {
  title: "My Profile",
  description: "Manage your TrendPilot profile and account security.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
