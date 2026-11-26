"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas/auth.schema";
import {
  useForgotPassword,
  useLogin,
  useRegister,
  useResetPassword,
} from "@/features/auth/hooks/useAuth";
import { getSafeAuthNextPath } from "@/lib/auth/safe-next-path";

function AuthLayout({ eyebrow, title, description, children, footer }) {
  return (
    <section className="min-h-[calc(100vh-160px)] bg-[#f7f8fa] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#e8e9ed] bg-white shadow-[0_24px_80px_rgba(20,36,61,0.08)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-[#14243d] p-10 text-white lg:flex">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 45%, #ffffff 45.2%, transparent 45.5%), linear-gradient(45deg, transparent 45%, #ffffff 45.2%, transparent 45.5%)",
              backgroundSize: "75px 75px",
            }}
          />
          <div className="relative">
            <Link
              href="/"
              className="font-serif text-3xl font-bold tracking-tight"
            >
              TrendPilot<span className="text-[#b99658]">.</span>
            </Link>
          </div>
          <div className="relative max-w-sm">
            <p className="mb-4 text-xs font-bold tracking-[0.24em] text-[#d2b77f] uppercase">
              Ideas. Insights. Opportunities.
            </p>
            <h2 className="font-serif text-4xl leading-tight tracking-tight">
              Navigate what matters. Discover what’s next.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Explore practical knowledge and fresh perspectives across the
              topics shaping business, technology, finance, education and
              everyday life.
            </p>
          </div>
          <p className="relative text-xs text-white/45">
            Independent ideas for a changing world.
          </p>
        </div>

        <div className="flex items-center justify-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-10 inline-block font-serif text-2xl font-bold tracking-tight text-[#14243d] lg:hidden"
            >
              TrendPilot<span className="text-[#b99658]">.</span>
            </Link>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#a27d42] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#14243d] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              {description}
            </p>
            <div className="mt-8">{children}</div>
            {footer ? (
              <div className="mt-8 border-t border-[#e8e9ed] pt-6 text-center text-sm text-[#6b7280]">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function FormMessage({ children, type = "error" }) {
  if (!children) return null;

  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`mb-5 rounded-lg border px-4 py-3 text-sm leading-6 ${styles}`}
    >
      {children}
    </div>
  );
}

function Field({ label, id, type = "text", ...props }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-[#26354a]"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        className="w-full rounded-lg border border-[#dfe2e8] bg-white px-4 py-3 text-sm text-[#172033] transition outline-none placeholder:text-[#9ca3af] focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/15"
        {...props}
      />
    </div>
  );
}

function getApiError(error) {
  return (
    error?.response?.data?.error?.message ||
    "Something went wrong. Please try again."
  );
}

export function LoginForm({
  verified,
  passwordUpdated,
  confirmationError,
  next,
}) {
  const router = useRouter();
  const login = useLogin();
  const [formError, setFormError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message || "Check your details.");
      return;
    }

    try {
      await login.mutateAsync(result.data);
      router.replace(getSafeAuthNextPath(next) || "/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(getApiError(error));
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to TrendPilot"
      description="Access your account and continue exploring ideas that move you forward."
      footer={
        <>
          New to TrendPilot?{" "}
          <Link
            href="/auth/register"
            className="font-semibold text-[#14243d] hover:text-[#a27d42]"
          >
            Create an account
          </Link>
        </>
      }
    >
      {verified ? (
        <FormMessage type="success">
          Your email has been verified. You can now sign in.
        </FormMessage>
      ) : null}
      {passwordUpdated ? (
        <FormMessage type="success">
          Your password has been updated. Sign in with your new password.
        </FormMessage>
      ) : null}
      {confirmationError === "confirmation_expired" ? (
        <FormMessage>
          This confirmation link has expired or has already been used. Please
          register again if necessary or contact support.
        </FormMessage>
      ) : null}
      {confirmationError === "confirmation" ? (
        <FormMessage>
          We could not verify this confirmation link. Please request a new
          confirmation email or contact support.
        </FormMessage>
      ) : null}
      <FormMessage>{formError}</FormMessage>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#26354a]"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-[#98743d] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[#dfe2e8] bg-white px-4 py-3 text-sm text-[#172033] transition outline-none placeholder:text-[#9ca3af] focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/15"
            placeholder="Enter your password"
          />
        </div>
        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-lg bg-[#14243d] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {login.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function RegisterForm({ next }) {
  const register = useRegister();
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setFormError("Your passwords do not match.");
      return;
    }

    const result = registerSchema.safeParse({
      displayName,
      email,
      password,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message || "Check your details.");
      return;
    }

    try {
      const response = await register.mutateAsync({
        payload: result.data,
        next,
      });
      setSuccessMessage(
        response.message ||
          "If your account can be registered, a verification email will be sent.",
      );
      setDisplayName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setFormError(getApiError(error));
    }
  }

  return (
    <AuthLayout
      eyebrow="Join the community"
      title="Create your account"
      description="Sign up to stay connected with useful insights and fresh perspectives."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-[#14243d] hover:text-[#a27d42]"
          >
            Sign in
          </Link>
        </>
      }
    >
      <FormMessage>{formError}</FormMessage>
      <FormMessage type="success">{successMessage}</FormMessage>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="displayName"
          label="Full name"
          autoComplete="name"
          placeholder="Your name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <Field
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="At least 12 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Field
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="Enter your password again"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <p className="text-xs leading-5 text-[#7b8492]">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="font-semibold text-[#14243d] underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-semibold text-[#14243d] underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="submit"
          disabled={register.isPending}
          className="w-full rounded-lg bg-[#14243d] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {register.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message || "Enter a valid email.");
      return;
    }

    try {
      const response = await forgotPassword.mutateAsync(result.data);
      setSuccessMessage(response.message);
    } catch (error) {
      setFormError(getApiError(error));
    }
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email address associated with your account. If it exists, we'll send instructions to reset your password."
      footer={
        <Link
          href="/auth/login"
          className="font-semibold text-[#14243d] hover:text-[#a27d42]"
        >
          Return to sign in
        </Link>
      }
    >
      <FormMessage>{formError}</FormMessage>
      <FormMessage type="success">{successMessage}</FormMessage>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="submit"
          disabled={forgotPassword.isPending}
          className="w-full rounded-lg bg-[#14243d] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {forgotPassword.isPending
            ? "Sending instructions..."
            : "Send reset instructions"}
        </button>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordForm({ linkError }) {
  const router = useRouter();
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (password !== confirmPassword) {
      setFormError("Your passwords do not match.");
      return;
    }

    const result = resetPasswordSchema.safeParse({ password });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message || "Check your password.");
      return;
    }

    try {
      await resetPassword.mutateAsync(result.data);
      router.replace("/auth/login?password=updated");
      router.refresh();
    } catch (error) {
      setFormError(getApiError(error));
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure your account"
      title="Choose a new password"
      description="Create a new password with at least 12 characters. You will be able to sign in with it once the update succeeds."
      footer={
        <Link
          href="/auth/login"
          className="font-semibold text-[#14243d] hover:text-[#a27d42]"
        >
          Return to sign in
        </Link>
      }
    >
      <FormMessage>{formError}</FormMessage>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="At least 12 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Field
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="Enter your new password again"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <button
          type="submit"
          disabled={resetPassword.isPending}
          className="w-full rounded-lg bg-[#14243d] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resetPassword.isPending ? "Updating password..." : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
