"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";

import { useSubmitAuthorApplication } from "@/features/users/mutations/author-application.mutations";
import { useMyAuthorApplication } from "@/features/users/queries/author-application.queries";

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function AuthorApplicationForm() {
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const applicationQuery = useMyAuthorApplication();
  const existingApplication = applicationQuery.data?.application;

  const applicationMutation = useSubmitAuthorApplication();

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccess(false);

    try {
      await applicationMutation.mutateAsync({
        motivation,
        experience,
        portfolioUrl,
      });

      setSuccess(true);
      setMotivation("");
      setExperience("");
      setPortfolioUrl("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  if (applicationQuery.isPending) {
    return (
      <div className="container-main py-12">
        <div className="mx-auto max-w-3xl animate-pulse">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="mt-6 h-40 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (applicationQuery.isError) {
    return (
      <div className="container-main py-12">
        <div className="mx-auto max-w-3xl rounded-lg border border-red-100 bg-red-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <AlertCircle size={17} />
            Could not check your application status.
          </div>
          <p className="mt-2 text-sm text-red-700">
            {getErrorMessage(applicationQuery.error)}
          </p>
          <button
            type="button"
            onClick={() => applicationQuery.refetch()}
            className="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (existingApplication?.status === "pending") {
    return (
      <div className="container-main py-8 pb-16 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-amber-900">
            <AlertCircle size={20} />
            Application awaiting review
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-800">
            Your author application has been submitted and is waiting for an
            administrator to review it. You cannot submit another application
            while this one is pending.
          </p>
          <p className="mt-4 text-xs text-amber-700">
            Submitted:{" "}
            {existingApplication.submitted_at
              ? new Date(existingApplication.submitted_at).toLocaleDateString()
              : "Date unavailable"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main py-8 pb-16 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-[#b99658] uppercase">
            Write for TrendPilot
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#14243d] sm:text-4xl">
            Apply to become an author
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Tell us about your writing interests, relevant experience, and why
            you would like to contribute to TrendPilot. An administrator will
            review your application.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-xl border border-[#e8e9ed] bg-white p-5 shadow-sm sm:p-8"
        >
          {existingApplication?.status === "rejected" && (
            <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                Your previous application was not approved.
              </p>
              <p className="mt-1 text-sm leading-6 text-red-700">
                You may submit a revised application for another review.
              </p>
              {existingApplication.review_note && (
                <p className="mt-3 border-t border-red-200 pt-3 text-sm leading-6 text-red-800">
                  <span className="font-semibold">Review feedback: </span>
                  {existingApplication.review_note}
                </p>
              )}
            </div>
          )}
          <div>
            <label
              htmlFor="author-motivation"
              className="block text-sm font-semibold text-[#172033]"
            >
              Why do you want to write for TrendPilot?
            </label>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Explain your interests and what you hope to contribute.
            </p>

            <textarea
              id="author-motivation"
              value={motivation}
              onChange={(event) => setMotivation(event.target.value)}
              minLength={50}
              maxLength={5000}
              rows={6}
              required
              placeholder="Tell us why you want to become a TrendPilot author..."
              className="mt-3 w-full rounded-md border border-[#dfe2e8] px-3.5 py-3 text-sm leading-6 text-[#172033] transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {motivation.length}/5,000 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="author-experience"
              className="block text-sm font-semibold text-[#172033]"
            >
              Your writing experience
            </label>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Include relevant topics, previous publications, skills, or
              experience. New writers are welcome.
            </p>

            <textarea
              id="author-experience"
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              minLength={20}
              maxLength={5000}
              rows={6}
              required
              placeholder="Describe your writing or subject-matter experience..."
              className="mt-3 w-full rounded-md border border-[#dfe2e8] px-3.5 py-3 text-sm leading-6 text-[#172033] transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {experience.length}/5,000 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="author-portfolio"
              className="block text-sm font-semibold text-[#172033]"
            >
              Portfolio or writing samples
              <span className="ml-2 font-normal text-gray-400">Optional</span>
            </label>

            <input
              id="author-portfolio"
              type="url"
              value={portfolioUrl}
              onChange={(event) => setPortfolioUrl(event.target.value)}
              maxLength={2048}
              placeholder="https://example.com/your-work"
              className="mt-3 h-11 w-full rounded-md border border-[#dfe2e8] px-3.5 text-sm text-[#172033] transition outline-none placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex gap-2 rounded-md border border-red-100 bg-red-50 p-3 text-sm leading-5 text-red-700"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm leading-5 text-emerald-800"
            >
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
              <span>
                Your application has been submitted successfully. It is now
                awaiting administrator review.
              </span>
            </div>
          )}

          <div className="border-t border-[#e8e9ed] pt-5">
            <button
              type="submit"
              disabled={applicationMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#14243d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {applicationMutation.isPending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Submit application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
