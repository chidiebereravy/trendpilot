"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layers3,
  Plus,
  Search,
  Tag,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/features/categories/hooks/useCategories";

import {
  createCategorySchema,
  updateCategorySchema,
} from "@/features/categories/schemas/category.schema";

import { slugify } from "@/lib/utils";

const statusStyles = {
  draft: "bg-gray-100 text-gray-600",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-amber-50 text-amber-700",
};

const emptyForm = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  displayOrder: 0,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function StatusLabel({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
        statusStyles[status] || statusStyles.draft
      }`}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="border border-[#e8e9ed] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <Icon size={18} className="text-[#b99658]" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#14243d]">
        {value}
      </p>
    </div>
  );
}

function CategoryForm({
  category,
  categories,
  onClose,
  onSubmit,
  isPending,
  error,
}) {
  const isEditing = Boolean(category);
  const isBroad = category?.level === "broad";

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    name: category?.name || "",
    slug: category?.slug || "",
    parentId: category?.parent_id || "",
    description: category?.description || "",
    status: category?.status || "draft",
    seoTitle: category?.seo_title || "",
    seoDescription: category?.seo_description || "",
    displayOrder: category?.display_order ?? 0,
  }));

  const availableParents = categories.filter(
    (item) => item.level === "broad" || item.level === "subcategory",
  );

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "name" && !isEditing) {
        next.slug = slugify(value);
      }

      return next;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || null,
      status: form.status,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
      displayOrder: Number(form.displayOrder),
    };

    if (!isEditing) {
      payload.parentId = form.parentId;
    }

    if (isEditing && isBroad) {
      delete payload.name;
      delete payload.slug;
    }

    onSubmit(payload);
  }

  const inputClass =
    "mt-2 w-full rounded-sm border border-[#dfe2e8] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition focus:border-[#b99658] focus:ring-2 focus:ring-[#b99658]/10";

  const labelClass = "text-xs font-semibold text-[#344054]";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101d30]/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        className="my-auto w-full max-w-2xl rounded-sm bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#e8e9ed] px-6 py-5 sm:px-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase">
              Category management
            </p>
            <h2
              id="category-form-title"
              className="mt-2 text-xl font-bold text-[#14243d]"
            >
              {isEditing ? "Edit category" : "Create a category"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {isEditing
                ? `Update ${category.name} and its publishing details.`
                : "Add a Subcategory or Micro Niche to your editorial structure."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-[#14243d]"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8">
          {!isEditing && (
            <div>
              <label className={labelClass} htmlFor="category-parent">
                Parent category
              </label>
              <select
                id="category-parent"
                required
                value={form.parentId}
                onChange={(event) =>
                  updateField("parentId", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Select a parent category</option>
                {availableParents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.level === "broad" ? "Broad Niche" : "Subcategory"}:{" "}
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] leading-5 text-gray-500">
                Selecting a Broad Niche creates a Subcategory. Selecting a
                Subcategory creates a Micro Niche.
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="category-name">
                Category name
              </label>
              <input
                id="category-name"
                required={!isBroad}
                disabled={isBroad}
                maxLength={80}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                placeholder="e.g. Digital Marketing"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="category-slug">
                URL slug
              </label>
              <input
                id="category-slug"
                disabled={isBroad}
                maxLength={100}
                value={form.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                placeholder="digital-marketing"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="category-description">
              Description
            </label>
            <textarea
              id="category-description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              className={inputClass}
              placeholder="Describe what readers will discover in this category."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="category-status">
                Publication status
              </label>
              <select
                id="category-status"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="category-order">
                Display order
              </label>
              <input
                id="category-order"
                type="number"
                min="0"
                max="100000"
                value={form.displayOrder}
                onChange={(event) =>
                  updateField("displayOrder", event.target.value)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-[#e8e9ed] pt-5">
            <p className="text-xs font-bold text-[#14243d]">
              Search engine optimisation
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className={labelClass} htmlFor="category-seo-title">
                  SEO title
                </label>
                <input
                  id="category-seo-title"
                  maxLength={70}
                  value={form.seoTitle}
                  onChange={(event) =>
                    updateField("seoTitle", event.target.value)
                  }
                  className={inputClass}
                  placeholder="A clear, search-friendly title"
                />
                <p className="mt-1 text-right text-[10px] text-gray-400">
                  {form.seoTitle.length}/70
                </p>
              </div>

              <div>
                <label
                  className={labelClass}
                  htmlFor="category-seo-description"
                >
                  SEO description
                </label>
                <textarea
                  id="category-seo-description"
                  rows={2}
                  maxLength={170}
                  value={form.seoDescription}
                  onChange={(event) =>
                    updateField("seoDescription", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Summarise this category for search results."
                />
                <p className="mt-1 text-right text-[10px] text-gray-400">
                  {form.seoDescription.length}/170
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e8e9ed] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-[#dfe2e8] px-5 py-3 text-xs font-semibold text-[#344054] transition hover:border-[#b99658]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-sm bg-[#14243d] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#203653] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Create category"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CategoryRow({ category, onEdit, onDelete }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#f0f0f0] py-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-[#f7f5f0] text-[#a78348]">
          <Tag size={15} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#26354a]">
              {category.name}
            </p>
            <StatusLabel status={category.status} />
          </div>
          <p className="mt-1 truncate text-[11px] text-gray-400">
            /{category.slug}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-11 sm:pl-0">
        <button
          type="button"
          onClick={() => onEdit(category)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[#e8e9ed] px-3 py-2 text-[11px] font-semibold text-[#344054] transition hover:border-[#b99658] hover:text-[#98743d]"
        >
          <Pencil size={13} />
          Edit
        </button>

        <button
          type="button"
          onClick={() => onDelete(category)}
          aria-label={`Delete ${category.name}`}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[#e8e9ed] px-3 py-2 text-[11px] font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-600"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

function BroadNicheCard({
  category,
  subcategories,
  onEdit,
  onCreate,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="overflow-hidden border border-[#e8e9ed] bg-white">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`}
            className="mt-1 rounded-sm p-1 text-gray-400 transition hover:bg-gray-100 hover:text-[#14243d]"
          >
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#f6f1e7] text-[#a78348]">
            <FolderTree size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[#14243d]">
                {category.name}
              </h3>
              <span className="text-[9px] font-bold tracking-[0.12em] text-[#a78348] uppercase">
                Broad Niche
              </span>
              <StatusLabel status={category.status} />
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {subcategories.length} Subcategories
            </p>

            {category.description && (
              <p className="mt-2 max-w-xl text-xs leading-5 text-gray-500">
                {category.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="rounded-sm border border-[#e8e9ed] px-3 py-2 text-[11px] font-semibold text-[#344054] transition hover:border-[#b99658]"
          >
            Edit details
          </button>

          <button
            type="button"
            onClick={() => onCreate(category)}
            className="inline-flex items-center gap-1.5 rounded-sm bg-[#14243d] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#203653]"
          >
            <Plus size={14} />
            Add Subcategory
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#e8e9ed] bg-[#fcfcfb] px-5 sm:px-6">
          {subcategories.length === 0 ? (
            <div className="py-7 pl-5 text-xs text-gray-400">
              No Subcategories yet. Add the first one to begin building this
              niche.
            </div>
          ) : (
            subcategories.map((subcategory) => (
              <div
                key={subcategory.id}
                className="border-b border-[#eeeae2] py-4 last:border-b-0"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-white text-[#a78348]">
                      <Layers3 size={15} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#26354a]">
                          {subcategory.name}
                        </p>
                        <StatusLabel status={subcategory.status} />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {subcategory.microNiches.length} Micro Niches
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pl-11 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => onEdit(subcategory)}
                      className="rounded-sm border border-[#e8e9ed] px-3 py-2 text-[11px] font-semibold text-[#344054] transition hover:border-[#b99658]"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => onCreate(subcategory)}
                      className="inline-flex items-center gap-1 rounded-sm border border-[#d9d2c4] px-3 py-2 text-[11px] font-semibold text-[#8a6b3e] transition hover:bg-[#f6f1e7]"
                    >
                      <Plus size={13} />
                      Add Micro Niche
                    </button>
                  </div>
                </div>

                {subcategory.microNiches.length > 0 && (
                  <div className="mt-2 pl-2 sm:pl-11">
                    {subcategory.microNiches.map((micro) => (
                      <CategoryRow
                        key={micro.id}
                        category={micro}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default function CategoryManagement() {
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCategories();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalCategory, setModalCategory] = useState(null);
  const [createParent, setCreateParent] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const broadNiches = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    function matchesFilters(item) {
      const matchesSearch =
        !searchValue ||
        item.name.toLowerCase().includes(searchValue) ||
        item.slug.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    }

    return categories
      .filter((item) => item.level === "broad")
      .map((broad) => {
        const broadMatches = matchesFilters(broad);

        const subcategories = categories
          .filter(
            (item) =>
              item.parent_id === broad.id && item.level === "subcategory",
          )
          .map((subcategory) => {
            const microNiches = categories.filter(
              (item) =>
                item.parent_id === subcategory.id &&
                item.level === "micro" &&
                matchesFilters(item),
            );

            const subcategoryMatches = matchesFilters(subcategory);

            return {
              ...subcategory,
              microNiches,
              isVisible: subcategoryMatches || microNiches.length > 0,
            };
          })
          .filter((subcategory) => subcategory.isVisible)
          .map(({ isVisible, ...subcategory }) => subcategory);

        const hasMatchingDescendants = subcategories.length > 0;

        return {
          ...broad,
          subcategories:
            broadMatches && !searchValue && statusFilter === "all"
              ? categories
                  .filter(
                    (item) =>
                      item.parent_id === broad.id &&
                      item.level === "subcategory",
                  )
                  .map((subcategory) => ({
                    ...subcategory,
                    microNiches: categories.filter(
                      (item) =>
                        item.parent_id === subcategory.id &&
                        item.level === "micro",
                    ),
                  }))
              : subcategories,
          isVisible: broadMatches || hasMatchingDescendants,
        };
      })
      .filter((broad) => broad.isVisible)
      .map(({ isVisible, ...broad }) => broad);
  }, [categories, search, statusFilter]);

  const counts = useMemo(
    () => ({
      broad: categories.filter((item) => item.level === "broad").length,
      subcategories: categories.filter((item) => item.level === "subcategory")
        .length,
      micro: categories.filter((item) => item.level === "micro").length,
      published: categories.filter((item) => item.status === "published")
        .length,
    }),
    [categories],
  );

  function openCreate(parent = null) {
    setModalCategory(null);
    setCreateParent(parent);
    setIsCreateOpen(true);
    setFormError("");
  }

  function openEdit(category) {
    setIsCreateOpen(false);
    setCreateParent(null);
    setModalCategory(category);
    setFormError("");
  }

  function closeForm() {
    setModalCategory(null);
    setCreateParent(null);
    setIsCreateOpen(false);
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
  }

  function handleSubmit(payload) {
    setFormError("");

    if (modalCategory) {
      const result = updateCategorySchema.safeParse(payload);

      if (!result.success) {
        setFormError(result.error.issues[0]?.message || "Check your entries.");
        return;
      }

      updateMutation.mutate(
        { categoryId: modalCategory.id, payload: result.data },
        {
          onSuccess: closeForm,
          onError: (mutationError) =>
            setFormError(getErrorMessage(mutationError)),
        },
      );

      return;
    }

    const result = createCategorySchema.safeParse({
      ...payload,
      parentId: createParent?.id,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message || "Check your entries.");
      return;
    }

    createMutation.mutate(result.data, {
      onSuccess: closeForm,
      onError: (mutationError) => setFormError(getErrorMessage(mutationError)),
    });
  }

  function handleDelete(category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This action cannot be undone. Categories referenced by articles or child categories cannot be deleted.`,
    );

    if (!confirmed) return;

    deleteMutation.mutate(category.id, {
      onError: (mutationError) => {
        window.alert(getErrorMessage(mutationError));
      },
    });
  }

  const modalOpen = isCreateOpen || Boolean(modalCategory);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="border-b border-[#e8e9ed] bg-white">
        <div className="container-main py-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-[#a78348] uppercase">
                <FolderTree size={14} />
                Editorial CMS
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#14243d] sm:text-4xl">
                Category management
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
                Organise TrendPilot&apos;s editorial structure from Broad Niches
                to focused Micro Niches. Manage descriptions, publication status
                and search metadata in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openCreate(null)}
              className="inline-flex items-center justify-center gap-2 self-start rounded-sm bg-[#14243d] px-5 py-3.5 text-xs font-bold text-white transition hover:bg-[#203653]"
            >
              <Plus size={16} />
              Add category
            </button>
          </div>
        </div>
      </div>

      <div className="container-main space-y-8 py-8 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Broad Niches"
            value={counts.broad}
            icon={FolderTree}
          />
          <StatCard
            label="Subcategories"
            value={counts.subcategories}
            icon={Layers3}
          />
          <StatCard label="Micro Niches" value={counts.micro} icon={Tag} />
          <StatCard
            label="Published categories"
            value={counts.published}
            icon={ChevronRight}
          />
        </div>

        <section className="border border-[#e8e9ed] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-[#14243d]">
                Editorial taxonomy
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Browse and manage the complete category hierarchy.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search categories..."
                  aria-label="Search categories"
                  className="w-full rounded-sm border border-[#e8e9ed] py-2.5 pr-3 pl-9 text-xs transition outline-none focus:border-[#b99658]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by publication status"
                className="rounded-sm border border-[#e8e9ed] bg-white px-3 py-2.5 text-xs text-[#344054] outline-none focus:border-[#b99658]"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="border border-[#e8e9ed] bg-white px-6 py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#e8e9ed] border-t-[#b99658]" />
            <p className="mt-4 text-sm text-gray-500">
              Loading your category structure...
            </p>
          </div>
        )}

        {isError && (
          <div className="border border-red-200 bg-white p-6">
            <p className="text-sm font-semibold text-red-700">
              Categories could not be loaded.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {getErrorMessage(error)}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-sm bg-[#14243d] px-4 py-2.5 text-xs font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && broadNiches.length === 0 && (
          <div className="border border-[#e8e9ed] bg-white px-6 py-16 text-center">
            <FolderTree size={28} className="mx-auto text-[#b99658]" />
            <p className="mt-4 text-sm font-semibold text-[#14243d]">
              No matching categories
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Try another search or publication status.
            </p>
          </div>
        )}

        {!isLoading && !isError && broadNiches.length > 0 && (
          <div className="space-y-5">
            {broadNiches.map((broad) => (
              <BroadNicheCard
                key={broad.id}
                category={broad}
                subcategories={broad.subcategories}
                onEdit={openEdit}
                onCreate={openCreate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <CategoryForm
          category={modalCategory}
          categories={categories}
          onClose={closeForm}
          onSubmit={handleSubmit}
          isPending={isPending}
          error={formError}
        />
      )}
    </div>
  );
}
