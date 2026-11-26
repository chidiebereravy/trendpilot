import RegisterPageClient from "@/features/auth/components/RegisterPageClient";

export const metadata = {
  title: "Create an Account | TrendPilot",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
