import { connection } from "next/server";
import { notFound } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import AcceptEditorInvitation from "@/features/users/components/AcceptEditorInvitation";

export const metadata = {
  title: "Accept Editor Invitation | TrendPilot",
  robots: {
    index: false,
    follow: false,
  },
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export default async function EditorInvitationPage({ searchParams }) {
  await connection();

  const params = await searchParams;
  const token = params?.token;

  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    notFound();
  }

  let isAuthenticated = false;
  let email = null;

  try {
    const { user } = await requireAuthenticatedUser();
    isAuthenticated = true;
    email = user.email ?? null;
  } catch (error) {
    if (error.status !== 401) {
      throw error;
    }
  }

  return (
    <AcceptEditorInvitation
      token={token}
      isAuthenticated={isAuthenticated}
      email={email}
    />
  );
}
