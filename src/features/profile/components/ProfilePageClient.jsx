"use client";

import { useEffect, useMemo, useState } from "react";

import {
  useChangeProfilePassword,
  useProfile,
  useUpdateProfile,
} from "@/features/profile/hooks/useProfile";

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TP"
  );
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-[0.16em] text-[#a17b43] uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[#14243d]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function Field({ label, value, readOnly = false, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#14243d] transition outline-none placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500 focus:border-[#c4a16a] focus:ring-4 focus:ring-[#c4a16a]/10"
      />
    </label>
  );
}

function StatusMessage({ children, type = "success" }) {
  const styles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
      role="status"
    >
      {children}
    </p>
  );
}

export default function ProfilePageClient() {
  const profileQuery = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const passwordMutation = useChangeProfilePassword();

  const profile = profileQuery.data;

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileMessage, setProfileMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    function initializeDisplayName() {
      if (profile) {
        setDisplayName(profile.displayName || "");
      }
    }
    initializeDisplayName();
  }, [profile]);

  const initials = useMemo(
    () => getInitials(profile?.displayName),
    [profile?.displayName],
  );

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileMessage(null);

    try {
      await updateProfileMutation.mutateAsync({
        displayName: displayName.trim(),
      });

      setProfileMessage({
        type: "success",
        text: "Your profile has been updated.",
      });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to update your profile."),
      });
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordMessage(null);

    if (password !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Your passwords do not match.",
      });
      return;
    }

    try {
      await passwordMutation.mutateAsync({
        password,
        confirmPassword,
      });

      setPassword("");
      setConfirmPassword("");

      setPasswordMessage({
        type: "success",
        text: "Your password has been changed successfully.",
      });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to change your password."),
      });
    }
  }

  if (profileQuery.isPending) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#c4a16a]" />
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <h2 className="font-semibold text-[#14243d]">
          Your profile could not be loaded
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {getErrorMessage(
            profileQuery.error,
            "Please refresh the page and try again.",
          )}
        </p>
        <button
          type="button"
          onClick={() => profileQuery.refetch()}
          className="mt-5 rounded-xl bg-[#14243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#203653]"
        >
          Try again
        </button>
      </div>
    );
  }

  const emailVerified = Boolean(profile.emailConfirmedAt);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-10">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-[#a17b43] uppercase">
          Account
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#14243d] sm:text-3xl">
          My Profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Manage your personal information and keep your account secure.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-[#14243d] via-[#a17b43] to-[#d6bd91]" />

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#14243d] text-2xl font-semibold tracking-wide text-white shadow-sm">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold text-[#14243d]">
              {profile.displayName || "TrendPilot member"}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {profile.email || "No email address available"}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f5f1e9] px-3 py-1 text-xs font-semibold text-[#8b6939] capitalize">
                {profile.role}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  emailVerified
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {emailVerified ? "Email verified" : "Email not verified"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading
            eyebrow="Personal information"
            title="Profile details"
            description="Update the name displayed across your TrendPilot account."
          />

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <Field
              label="Display name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setProfileMessage(null);
              }}
              placeholder="Enter your display name"
            />

            <Field label="Email address" value={profile.email || ""} readOnly />

            {profileMessage && (
              <StatusMessage type={profileMessage.type}>
                {profileMessage.text}
              </StatusMessage>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">
                Only your display name can be edited here.
              </p>

              <button
                type="submit"
                disabled={
                  updateProfileMutation.isPending ||
                  displayName.trim().length < 2 ||
                  displayName.trim() === (profile.displayName || "")
                }
                className="rounded-xl bg-[#14243d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <SectionHeading
            eyebrow="Account information"
            title="Account overview"
            description="Your account identity and access information."
          />

          <dl className="space-y-5">
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Account role
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#14243d] capitalize">
                {profile.role}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Account ID
              </dt>
              <dd className="mt-1 font-mono text-xs break-all text-slate-600">
                {profile.id}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Member since
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#14243d]">
                {formatDate(profile.createdAt)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Profile last updated
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#14243d]">
                {formatDate(profile.updatedAt)}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                Email verification
              </dt>
              <dd
                className={`mt-1 text-sm font-semibold ${
                  emailVerified ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {emailVerified ? "Verified" : "Pending verification"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <SectionHeading
          eyebrow="Account security"
          title="Change your password"
          description="Choose a strong password that you do not use on other websites."
        />

        <form onSubmit={handlePasswordSubmit} className="max-w-2xl space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="New password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordMessage(null);
              }}
              placeholder="At least 12 characters"
            />

            <Field
              label="Confirm new password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setPasswordMessage(null);
              }}
              placeholder="Enter password again"
            />
          </div>

          <p className="text-xs leading-5 text-slate-400">
            Your new password must contain at least 12 characters and no more
            than 128 characters.
          </p>

          {passwordMessage && (
            <StatusMessage type={passwordMessage.type}>
              {passwordMessage.text}
            </StatusMessage>
          )}

          <div className="border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={
                passwordMutation.isPending ||
                password.length < 12 ||
                password.length > 128 ||
                !confirmPassword
              }
              className="rounded-xl border border-[#14243d] bg-white px-5 py-3 text-sm font-semibold text-[#14243d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordMutation.isPending
                ? "Updating password..."
                : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
