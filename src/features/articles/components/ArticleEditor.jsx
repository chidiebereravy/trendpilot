"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  ImagePlus,
  List,
  ListOrdered,
  LoaderCircle,
  Plus,
  Quote,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";

import { useArticleOptions } from "@/features/articles/queries/article-options.queries";
import {
  useCreateArticle,
  useUpdateArticle,
} from "@/features/articles/mutations/article.mutations";
import { useArticle } from "@/features/articles/queries/article.queries";
import { useMedia } from "@/features/media/hooks/useMedia";
import { slugify } from "@/lib/utils";
import ArticleAffiliatePlacementEditor from "@/features/affiliate/components/ArticleAffiliatePlacementEditor";

const inputClass =
  "mt-2 w-full rounded-sm border border-[#dfe2e8] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition placeholder:text-gray-400 focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10";

const labelClass = "text-xs font-semibold text-[#344054]";

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function createBlock(type) {
  const id = crypto.randomUUID();

  if (type === "heading") {
    return { id, type, level: "h2", text: "" };
  }

  if (type === "quote") {
    return { id, type, text: "" };
  }

  if (type === "list") {
    return { id, type, style: "bullet", items: [""] };
  }

  return { id, type: "paragraph", text: "" };
}

function BlockEditor({ blocks, onChange }) {
  function updateBlock(index, updates) {
    onChange(
      blocks.map((block, blockIndex) =>
        blockIndex === index ? { ...block, ...updates } : block,
      ),
    );
  }

  function removeBlock(index) {
    onChange(blocks.filter((_, blockIndex) => blockIndex !== index));
  }

  function addBlock(type) {
    onChange([...blocks, createBlock(type)]);
  }

  return (
    <section className="border border-[#e8e9ed] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f2] px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-[#14243d]">Article content</h2>
          <p className="mt-1 text-[11px] text-gray-500">
            Build your article using structured content blocks.
          </p>
        </div>
        <span className="text-[11px] font-medium text-gray-400">
          {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {blocks.length === 0 && (
          <div className="border border-dashed border-[#dfe2e8] bg-[#fafbfc] px-5 py-12 text-center">
            <FileText className="mx-auto text-[#b99658]" size={26} />
            <p className="mt-3 text-sm font-semibold text-[#26354a]">
              Start writing your article
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Add a paragraph, heading, quotation or list below.
            </p>
          </div>
        )}

        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="group relative border border-[#edf0f2] bg-white p-3 transition focus-within:border-[#d7c49e] sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.12em] text-[#9a8055] uppercase">
                {block.type === "paragraph" && <Type size={14} />}
                {block.type === "heading" && <Bold size={14} />}
                {block.type === "quote" && <Quote size={14} />}
                {block.type === "list" && <List size={14} />}
                {block.type}
                <span className="text-gray-300">Â·</span>
                {String(index + 1).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={() => removeBlock(index)}
                aria-label={`Remove block ${index + 1}`}
                className="rounded-sm p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {block.type === "heading" && (
              <div className="mb-3">
                <select
                  aria-label="Heading level"
                  value={block.level}
                  onChange={(event) =>
                    updateBlock(index, { level: event.target.value })
                  }
                  className="rounded-sm border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#344054] outline-none focus:border-[#b99658]"
                >
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                </select>
              </div>
            )}

            {block.type === "list" && (
              <div className="mb-3">
                <select
                  aria-label="List style"
                  value={block.style}
                  onChange={(event) =>
                    updateBlock(index, { style: event.target.value })
                  }
                  className="rounded-sm border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#344054] outline-none focus:border-[#b99658]"
                >
                  <option value="bullet">Bullet list</option>
                  <option value="number">Numbered list</option>
                </select>
              </div>
            )}

            {block.type === "list" ? (
              <textarea
                value={block.items.join("\n")}
                onChange={(event) =>
                  updateBlock(index, {
                    items: event.target.value.split("\n"),
                  })
                }
                rows={Math.max(3, block.items.length + 1)}
                placeholder="Write one list item per line..."
                className={`${inputClass} resize-y leading-7`}
              />
            ) : (
              <textarea
                value={block.text}
                onChange={(event) =>
                  updateBlock(index, { text: event.target.value })
                }
                rows={block.type === "heading" ? 2 : 5}
                placeholder={
                  block.type === "heading"
                    ? "Write your section heading..."
                    : block.type === "quote"
                      ? "Write a quotation..."
                      : "Write your paragraph..."
                }
                className={`${inputClass} resize-y leading-7 ${
                  block.type === "heading" ? "text-lg font-semibold" : "text-sm"
                }`}
              />
            )}
          </div>
        ))}

        <div className="border-t border-[#edf0f2] pt-4">
          <p className="mb-3 text-[10px] font-bold tracking-[0.12em] text-gray-400 uppercase">
            Add a content block
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addBlock("paragraph")}
              className="inline-flex items-center gap-2 border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              <Plus size={13} /> Paragraph
            </button>
            <button
              type="button"
              onClick={() => addBlock("heading")}
              className="inline-flex items-center gap-2 border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              <Bold size={13} /> Heading
            </button>
            <button
              type="button"
              onClick={() => addBlock("quote")}
              className="inline-flex items-center gap-2 border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              <Quote size={13} /> Quote
            </button>
            <button
              type="button"
              onClick={() => addBlock("list")}
              className="inline-flex items-center gap-2 border border-[#e5e7eb] px-3 py-2 text-xs font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              <List size={13} /> List
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, htmlFor, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[11px] leading-5 text-gray-400">{hint}</p>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
        <Icon size={17} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-[#14243d]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ArticleEditor({ articleId = null }) {
  const router = useRouter();
  const isEditing = Boolean(articleId);

  const optionsQuery = useArticleOptions();
  const articleQuery = useArticle(articleId, {
    enabled: isEditing,
  });

  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const options = optionsQuery.data;
  const role = options?.currentRole;
  const permissions = options?.permissions ?? {};
  const canPublish = permissions.canPublishArticles === true;
  const canAssignAuthors = permissions.canAssignAuthors === true;

  const mediaQuery = useMedia({
    purpose: "article",
    page: 1,
    pageSize: 50,
    status: role === "author" ? "staged" : "published",
  });

  const categories = useMemo(
    () => options?.categories ?? [],
    [options?.categories],
  );

  const authors = options?.authors ?? [];
  const mediaItems = mediaQuery.data?.items ?? [];

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [broadId, setBroadId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [featuredImage, setFeaturedImage] = useState(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [activePanel, setActivePanel] = useState("organization");
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [existingFeaturedImagePath, setExistingFeaturedImagePath] =
    useState(null);
  const [articleInitialized, setArticleInitialized] = useState(false);
  const [initialStatus, setInitialStatus] = useState("draft");

  useEffect(() => {
    function initializeArticle() {
      if (!isEditing || !articleQuery.data || !categories.length) return;

      const article = articleQuery.data;
      const microNiche = categories.find(
        (item) => item.id === article.category_id,
      );

      const subcategory = microNiche
        ? categories.find((item) => item.id === microNiche.parent_id)
        : null;

      const broadNiche = subcategory
        ? categories.find((item) => item.id === subcategory.parent_id)
        : null;

      setTitle(article.title ?? "");
      setSlug(article.slug ?? "");
      setSlugManuallyEdited(true);
      setExcerpt(article.excerpt ?? "");

      setBlocks(
        (Array.isArray(article.content?.content)
          ? article.content.content
          : []
        ).map((block) => ({
          ...block,
          id: block.id || crypto.randomUUID(),
        })),
      );

      setCategoryId(article.category_id ?? "");
      setSubcategoryId(subcategory?.id ?? "");
      setBroadId(broadNiche?.id ?? "");

      setAuthorId(article.author_id ?? "");
      setExistingFeaturedImagePath(article.featured_image_path ?? null);
      setFeaturedImage(null);

      setSeoTitle(article.seo_title ?? "");
      setSeoDescription(article.seo_description ?? "");
      setFocusKeyword(article.focus_keyword ?? "");
      setCanonicalUrl(article.canonical_url ?? "");
      setNoIndex(article.no_index === true);
      setScheduledAt(toDateTimeLocal(article.scheduled_at));

      setInitialStatus(article.status);
      setArticleInitialized(true);
    }
    initializeArticle();
  }, [isEditing, articleQuery.data, categories, optionsQuery.isLoading]);

  const broadNiches = useMemo(
    () => categories.filter((item) => item.level === "broad"),
    [categories],
  );

  const subcategories = useMemo(
    () =>
      categories.filter(
        (item) => item.level === "subcategory" && item.parent_id === broadId,
      ),
    [categories, broadId],
  );

  const microNiches = useMemo(
    () =>
      categories.filter(
        (item) => item.level === "micro" && item.parent_id === subcategoryId,
      ),
    [categories, subcategoryId],
  );

  const selectedCategory = categories.find((item) => item.id === categoryId);

  const filteredMedia = mediaItems.filter((item) => {
    const search = imageSearch.trim().toLowerCase();
    if (!search) return true;

    return (
      item.original_filename?.toLowerCase().includes(search) ||
      item.alt_text?.toLowerCase().includes(search) ||
      item.caption?.toLowerCase().includes(search)
    );
  });

  const wordCount = useMemo(() => {
    const text = blocks
      .map((block) =>
        block.type === "list" ? block.items.join(" ") : block.text,
      )
      .join(" ");

    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [blocks]);

  function handleTitleChange(value) {
    setTitle(value);

    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleBroadChange(value) {
    setBroadId(value);
    setSubcategoryId("");
    setCategoryId("");
  }

  function handleSubcategoryChange(value) {
    setSubcategoryId(value);
    setCategoryId("");
  }

  function submitArticle(status, preserveStatus = false) {
    setFormError("");
    setSavedMessage("");

    if (!title.trim()) {
      setFormError("Enter an article title before saving.");
      return;
    }

    if (!categoryId) {
      setFormError("Select a Broad Niche, Subcategory and Micro Niche.");
      setActivePanel("organization");
      return;
    }

    const targetStatus = preserveStatus ? initialStatus : status;

    if (targetStatus === "scheduled") {
      if (!canPublish) {
        setFormError(
          "Your role does not have permission to schedule articles.",
        );
        return;
      }

      if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
        setFormError("Choose a future date and time for publication.");
        setActivePanel("publishing");
        return;
      }
    }

    if (targetStatus === "published" && !canPublish && !preserveStatus) {
      setFormError("Your role does not have permission to publish articles.");
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || null,
      content: {
        type: "doc",
        content: blocks,
      },
      categoryId,
      featuredImagePath:
        featuredImage?.object_path ?? existingFeaturedImagePath ?? null,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      focusKeyword: focusKeyword.trim() || null,
      canonicalUrl: canonicalUrl.trim() || null,
      noIndex,
      scheduledAt:
        targetStatus === "scheduled" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
      ...(preserveStatus ? {} : { status: targetStatus }),
      ...(canAssignAuthors && authorId ? { authorId } : {}),
    };

    const mutationOptions = {
      onSuccess: () => {
        const message = preserveStatus
          ? "Your article changes have been saved."
          : targetStatus === "in_review"
            ? "Your article has been submitted for editorial review."
            : targetStatus === "published"
              ? "Your article has been published."
              : targetStatus === "scheduled"
                ? "Your article has been scheduled."
                : "Your draft has been saved.";

        setSavedMessage(message);
        router.push("/dashboard/articles");
        router.refresh();
      },
      onError: (error) => {
        setFormError(getErrorMessage(error));
      },
    };

    if (isEditing) {
      updateMutation.mutate(
        {
          articleId,
          payload,
        },
        mutationOptions,
      );
    } else {
      createMutation.mutate(payload, mutationOptions);
    }
  }

  // if (!isEditing || !articleQuery.data || optionsQuery.isLoading) return;

  if (optionsQuery.isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-64 animate-pulse bg-gray-100" />
        <div className="h-72 animate-pulse border border-[#e8e9ed] bg-white" />
      </div>
    );
  }

  if (isEditing && articleQuery.isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-64 animate-pulse bg-gray-100" />
        <div className="h-72 animate-pulse border border-[#e8e9ed] bg-white" />
      </div>
    );
  }

  if (isEditing && articleQuery.isError) {
    return (
      <div className="border border-red-200 bg-white p-6">
        <h2 className="text-sm font-bold text-red-700">
          Article could not be loaded
        </h2>
        <p className="mt-2 text-xs text-gray-500">
          {getErrorMessage(articleQuery.error)}
        </p>
        <button
          type="button"
          onClick={() => articleQuery.refetch()}
          className="mt-4 bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isEditing && !articleInitialized) {
    return (
      <div className="h-72 animate-pulse border border-[#e8e9ed] bg-white" />
    );
  }

  if (optionsQuery.isError) {
    return (
      <div className="border border-red-200 bg-white p-6">
        <h2 className="text-sm font-bold text-red-700">
          Article editor could not be initialized
        </h2>
        <p className="mt-2 text-xs text-gray-500">
          {getErrorMessage(optionsQuery.error)}
        </p>
        <button
          type="button"
          onClick={() => optionsQuery.refetch()}
          className="mt-4 bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/articles"
            className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-gray-500 transition hover:text-[#14243d]"
          >
            <ArrowLeft size={14} /> Back to articles
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#14243d] sm:text-3xl">
            {isEditing ? "Edit article" : "Create article"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditing
              ? "Update your article, organization and publishing details."
              : "Create, organize and prepare your next article for publication."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {isEditing ? "Editing article" : "New article"}
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      {savedMessage && (
        <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="border border-[#e8e9ed] bg-white p-5 sm:p-7">
            <SectionHeading
              icon={FileText}
              title="Article details"
              description="Start with a clear, descriptive title and a compelling introduction."
            />

            <div className="space-y-5">
              <Field label="Article title" htmlFor="article-title">
                <input
                  id="article-title"
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  maxLength={200}
                  placeholder="Write a clear and engaging article title..."
                  className={`${inputClass} text-lg font-semibold`}
                />
                <div className="mt-1 text-right text-[10px] text-gray-400">
                  {title.length}/200
                </div>
              </Field>

              <Field
                label="URL slug"
                htmlFor="article-slug"
                hint="Use lowercase letters, numbers and hyphens. The slug becomes part of your article URL."
              >
                <div className="flex items-center border border-[#dfe2e8] focus-within:border-[#b99658]">
                  <span className="shrink-0 border-r border-[#e8e9ed] bg-[#fafbfc] px-3 py-3 text-xs text-gray-400">
                    /articles/
                  </span>
                  <input
                    id="article-slug"
                    value={slug}
                    onChange={(event) => {
                      setSlug(event.target.value);
                      setSlugManuallyEdited(true);
                    }}
                    maxLength={180}
                    placeholder="your-article-slug"
                    className="min-w-0 flex-1 px-3 py-3 text-sm text-[#172033] outline-none"
                  />
                </div>
              </Field>

              <Field
                label="Article excerpt"
                htmlFor="article-excerpt"
                hint="A concise summary for article listings and search previews. Maximum 320 characters."
              >
                <textarea
                  id="article-excerpt"
                  value={excerpt}
                  onChange={(event) => setExcerpt(event.target.value)}
                  maxLength={320}
                  rows={3}
                  placeholder="Summarize what readers will learn from this article..."
                  className={`${inputClass} resize-y leading-6`}
                />
                <div className="mt-1 text-right text-[10px] text-gray-400">
                  {excerpt.length}/320
                </div>
              </Field>
            </div>
          </section>

          <BlockEditor blocks={blocks} onChange={setBlocks} />

          {isEditing && (
            <ArticleAffiliatePlacementEditor
              articleId={articleId}
              blocks={blocks}
              role={role}
              articleStatus={initialStatus}
            />
          )}

          <section className="border border-[#e8e9ed] bg-white p-5 sm:p-7">
            <SectionHeading
              icon={Search}
              title="Search engine optimization"
              description="Prepare your article's search appearance and indexing preferences."
            />

            <div className="space-y-5">
              <Field
                label="SEO title"
                htmlFor="seo-title"
                hint="Recommended: up to 70 characters."
              >
                <input
                  id="seo-title"
                  value={seoTitle}
                  onChange={(event) => setSeoTitle(event.target.value)}
                  maxLength={70}
                  placeholder="Search result title"
                  className={inputClass}
                />
                <div className="mt-1 text-right text-[10px] text-gray-400">
                  {seoTitle.length}/70
                </div>
              </Field>

              <Field
                label="Meta description"
                htmlFor="seo-description"
                hint="A useful summary for search engines. Maximum 170 characters."
              >
                <textarea
                  id="seo-description"
                  value={seoDescription}
                  onChange={(event) => setSeoDescription(event.target.value)}
                  maxLength={170}
                  rows={3}
                  placeholder="Describe the value of this article in search results..."
                  className={`${inputClass} resize-y leading-6`}
                />
                <div className="mt-1 text-right text-[10px] text-gray-400">
                  {seoDescription.length}/170
                </div>
              </Field>

              <Field label="Focus keyword" htmlFor="focus-keyword">
                <input
                  id="focus-keyword"
                  value={focusKeyword}
                  onChange={(event) => setFocusKeyword(event.target.value)}
                  maxLength={100}
                  placeholder="Primary search phrase"
                  className={inputClass}
                />
              </Field>

              <Field
                label="Canonical URL"
                htmlFor="canonical-url"
                hint="Optional. Use this when the article's preferred URL is different from its eventual public URL."
              >
                <input
                  id="canonical-url"
                  type="url"
                  value={canonicalUrl}
                  onChange={(event) => setCanonicalUrl(event.target.value)}
                  placeholder="https://example.com/original-article"
                  className={inputClass}
                />
              </Field>

              <label className="flex cursor-pointer items-start gap-3 border border-[#edf0f2] p-4">
                <input
                  type="checkbox"
                  checked={noIndex}
                  onChange={(event) => setNoIndex(event.target.checked)}
                  className="mt-0.5 accent-[#14243d]"
                />
                <span>
                  <span className="block text-xs font-semibold text-[#344054]">
                    Discourage search engine indexing
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-gray-400">
                    Mark this article as no-index. Search engines may choose to
                    respect this instruction.
                  </span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside
          data-active-panel={activePanel}
          className="space-y-5 xl:sticky xl:top-6"
        >
          <section className="border border-[#e8e9ed] bg-white p-5">
            <SectionHeading
              icon={Settings2}
              title="Organization"
              description="Choose where this article belongs."
            />

            <div className="space-y-4">
              <Field label="Broad Niche" htmlFor="broad-niche">
                <select
                  id="broad-niche"
                  value={broadId}
                  onChange={(event) => handleBroadChange(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a broad niche</option>
                  {broadNiches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Subcategory" htmlFor="subcategory">
                <select
                  id="subcategory"
                  value={subcategoryId}
                  onChange={(event) =>
                    handleSubcategoryChange(event.target.value)
                  }
                  disabled={!broadId}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50`}
                >
                  <option value="">Select a subcategory</option>
                  {subcategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Micro Niche" htmlFor="micro-niche">
                <select
                  id="micro-niche"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={!subcategoryId}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50`}
                >
                  <option value="">Select a micro niche</option>
                  {microNiches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedCategory && (
                <div className="border border-[#eee7d9] bg-[#fcfaf6] p-3">
                  <p className="text-[10px] font-bold tracking-[0.1em] text-[#9a8055] uppercase">
                    Selected category
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#26354a]">
                    {broadNiches.find((item) => item.id === broadId)?.name}
                    <ChevronRight className="mx-1 inline" size={12} />
                    {
                      subcategories.find((item) => item.id === subcategoryId)
                        ?.name
                    }
                    <ChevronRight className="mx-1 inline" size={12} />
                    {selectedCategory.name}
                  </p>
                </div>
              )}

              {broadNiches.length === 0 && (
                <p className="text-xs leading-5 text-amber-700">
                  No published niche hierarchy is available. Publish the
                  required categories before creating an article.
                </p>
              )}

              {canAssignAuthors && (
                <Field label="Assign author" htmlFor="article-author">
                  <select
                    id="article-author"
                    value={authorId}
                    onChange={(event) => setAuthorId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Use my profile</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.display_name || "Unnamed user"} ({author.role})
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </section>

          <section className="border border-[#e8e9ed] bg-white p-5">
            <SectionHeading
              icon={ImagePlus}
              title="Featured image"
              description="Choose an image from your media library."
            />

            {featuredImage || existingFeaturedImagePath ? (
              <div>
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  {featuredImage?.preview_url && (
                    <Image
                      src={featuredImage.preview_url}
                      alt={
                        featuredImage.alt_text ||
                        featuredImage.original_filename
                      }
                      fill
                      unoptimized
                      sizes="320px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-semibold text-[#344054]">
                  {featuredImage?.original_filename ||
                    "Existing featured image"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFeaturedImage(null);
                    setExistingFeaturedImagePath(null);
                  }}
                  className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Remove featured image
                </button>
              </div>
            ) : (
              <div className="border border-dashed border-[#d9dce2] bg-[#fafbfc] px-4 py-8 text-center">
                <ImagePlus className="mx-auto text-[#b99658]" size={24} />
                <p className="mt-2 text-xs text-gray-500">
                  No featured image selected.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setImagePickerOpen((open) => !open)}
              className="mt-4 flex w-full items-center justify-center gap-2 border border-[#dfe2e8] px-4 py-3 text-xs font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              <ImagePlus size={14} />
              Browse media library
              <ChevronDown size={13} />
            </button>

            {imagePickerOpen && (
              <div className="mt-4 border-t border-[#edf0f2] pt-4">
                <input
                  value={imageSearch}
                  onChange={(event) => setImageSearch(event.target.value)}
                  placeholder="Search images..."
                  className={inputClass}
                />

                {mediaQuery.isLoading ? (
                  <p className="py-5 text-center text-xs text-gray-400">
                    Loading media...
                  </p>
                ) : mediaQuery.isError ? (
                  <p className="py-5 text-xs text-red-600">
                    {getErrorMessage(mediaQuery.error)}
                  </p>
                ) : filteredMedia.length === 0 ? (
                  <div className="py-5 text-center">
                    <p className="text-xs text-gray-500">
                      No eligible images found.
                    </p>
                    <Link
                      href="/dashboard/media"
                      className="mt-2 inline-block text-xs font-semibold text-[#9a8055]"
                    >
                      Open media library
                    </Link>
                  </div>
                ) : (
                  <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
                    {filteredMedia.map((asset) => (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => {
                          setFeaturedImage(asset);
                          setImagePickerOpen(false);
                        }}
                        className="overflow-hidden border border-[#e8e9ed] text-left transition hover:border-[#b99658]"
                      >
                        <div className="relative aspect-[4/3] bg-gray-100">
                          {asset.preview_url && (
                            <Image
                              src={asset.preview_url}
                              alt={asset.alt_text || asset.original_filename}
                              fill
                              unoptimized
                              sizes="150px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <p className="truncate p-2 text-[10px] font-medium text-[#344054]">
                          {asset.original_filename}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-[10px] leading-5 text-gray-400">
                  {role === "author"
                    ? "Your staged images are available for draft and review submissions."
                    : "Only published images are available for editorial publishing."}
                </p>
              </div>
            )}
          </section>

          <section className="border border-[#e8e9ed] bg-white p-5">
            <SectionHeading
              icon={Clock3}
              title="Publishing"
              description="Choose what happens when you save this article."
            />

            <div className="space-y-3">
              {canPublish && (
                <div>
                  <label htmlFor="scheduled-at" className={labelClass}>
                    Schedule date and time
                  </label>
                  <input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-[10px] leading-5 text-gray-400">
                    Scheduling requires a future date and time.
                  </p>
                </div>
              )}

              <div className="border-t border-[#edf0f2] pt-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Estimated word count</span>
                  <strong className="text-[#14243d]">{wordCount}</strong>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Content blocks</span>
                  <strong className="text-[#14243d]">{blocks.length}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2 border border-[#e8e9ed] bg-white p-4">
            {isEditing && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => submitArticle(initialStatus, true)}
                className="flex w-full items-center justify-center gap-2 bg-[#14243d] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#203957] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Save changes
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => submitArticle("draft")}
              className="flex w-full items-center justify-center gap-2 border border-[#dfe2e8] px-4 py-3 text-xs font-bold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              Save as draft
            </button>

            {canPublish ? (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => submitArticle("published")}
                  className="flex w-full items-center justify-center gap-2 bg-[#14243d] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#203957] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={14} /> Publish article
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => submitArticle("scheduled")}
                  className="flex w-full items-center justify-center gap-2 border border-[#dfe2e8] px-4 py-3 text-xs font-bold text-[#26354a] transition hover:border-[#b99658] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clock3 size={14} /> Schedule article
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => submitArticle("in_review")}
                className="flex w-full items-center justify-center gap-2 bg-[#14243d] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#203957] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} /> Submit for review
              </button>
            )}

            <p className="pt-1 text-center text-[10px] leading-5 text-gray-400">
              {canPublish
                ? "Publishing actions are available to editors and administrators."
                : "Your article will be reviewed by an editor before publication."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
