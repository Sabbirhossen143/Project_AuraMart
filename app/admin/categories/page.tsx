
"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  FolderPlus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  X,
  Save,
  RotateCcw,
  Layers,
  ImagePlus,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
}

const initialForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  isActive: true,
};

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CategoryManagementPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadCategories() {
    const response = await fetch("/api/categories", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load categories.");
    }

    const data = Array.isArray(result.data)
      ? result.data
      : result.data?.items ?? [];

    setCategories(data);
  }

  useEffect(() => {
    let active = true;

    async function initializePage() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to verify account.");
        }

        const user =
          result.data?.user ??
          result.data ??
          result.user ??
          result;

        if (user.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        if (!active) return;

        setAdminAllowed(true);
        await loadCategories();
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Something went wrong.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initializePage();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
  return () => {
    if (previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);

  function resetForm() {
  setForm(initialForm);
  setEditingId("");
  setSelectedFile(null);
  setPreviewUrl("");
  setError("");
  setSuccess("");

  const input = document.getElementById(
    "category-image"
  ) as HTMLInputElement | null;

  if (input) input.value = "";
}

function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];

  if (!file) return;

  setError("");
  setSuccess("");

  if (!ALLOWED_TYPES.includes(file.type)) {
    setError("Only JPG, PNG, WEBP and AVIF images are allowed.");
    event.target.value = "";
    return;
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    setError("Image size must be between 1 byte and 5 MB.");
    event.target.value = "";
    return;
  }

  setSelectedFile(file);
  setForm((prev) => ({ ...prev, image: "" }));
  setPreviewUrl(URL.createObjectURL(file));
}

async function handleImageUpload() {
  if (!selectedFile) {
    setError("Please select an image first.");
    return;
  }

  try {
    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Image upload failed.");
    }

    const uploadedUrl = result.data?.imageUrl;

    if (!uploadedUrl) {
      throw new Error("Cloudinary did not return an image URL.");
    }

    setForm((prev) => ({ ...prev, image: uploadedUrl }));
    setPreviewUrl(uploadedUrl);
    setSuccess("Category image uploaded successfully!");
    toast.success("Category image uploaded successfully.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image upload failed.";
    setError(message);
    toast.error(message);
  } finally {
    setUploading(false);
  }
}

  function handleEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      isActive: category.isActive,
    });

    setSelectedFile(null);
    setPreviewUrl(category.image || "");
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const wasEditing = Boolean(editingId);

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.image) {
       throw new Error("Please upload a category image first.");
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        image: form.image,
        isActive: form.isActive,
      };

      const response = await fetch(
        editingId
          ? `/api/categories?id=${encodeURIComponent(editingId)}`
          : "/api/categories",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to save category."
        );
      }

      resetForm();
      await loadCategories();
      const successMessage = wasEditing
        ? "Category updated successfully!"
        : "Category created successfully!";
      setSuccess(successMessage);
      toast.success(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save category.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(category: Category) {
    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/categories?id=${encodeURIComponent(category.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !category.isActive,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update category."
        );
      }

      await loadCategories();
      const successMessage = `${category.name} is now ${
        category.isActive ? "inactive" : "active"
      }.`;
      setSuccess(successMessage);
      toast.success(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update category.";
      setError(message);
      toast.error(message);
    }
  }

  function handleDelete(category: Category) {
    setDeleteTarget(category);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const category = deleteTarget;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/categories?id=${encodeURIComponent(category.id)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to delete category. Products may be assigned to it."
        );
      }

      await loadCategories();
      setDeleteTarget(null);
      setSuccess("Category deleted successfully!");
      toast.success(`"${category.name}" deleted successfully.`);

      if (editingId === category.id) {
        resetForm();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete category.";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </div>
    );
  }

  if (!adminAllowed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-500">
          {error || "Checking administrator access..."}
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/80 via-slate-50 to-slate-100 px-4 py-7 sm:px-6 sm:py-10">
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_-24px_rgba(15,23,42,0.55)]"
          >
            <div className="p-6 sm:p-7">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <AlertTriangle size={27} />
              </div>
              <h2 id="delete-category-title" className="mt-5 text-center text-xl font-extrabold tracking-tight text-slate-900">
                Delete Category?
              </h2>
              <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                Are you sure you want to permanently delete this category? This action cannot be undone.
              </p>
              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-bold text-slate-900">{deleteTarget.name}</p>
                <p className="mt-1 text-xs text-slate-500">/{deleteTarget.slug}</p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-rose-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-2">

        <div className="mb-8">
          <Link
            href="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to Account
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/70">
                <Layers size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Category Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your AuraMart store categories.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
              {categories.length} Total Categories
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} className="shrink-0" />
            {success}
          </div>
        )}

        <div className="grid items-start gap-7 lg:grid-cols-[0.85fr_1.15fr]">

          {/* Category Form */}
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Category" : "Add New Category"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700"
                >
                  <X size={15} />
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: createSlug(name),
                    }));
                  }}
                  placeholder="e.g. Electronics"
                  required
                  minLength={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category Slug *
                </label>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: createSlug(e.target.value),
                    }))
                  }
                  placeholder="electronics"
                  required
                  minLength={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe this category..."
                  required
                  minLength={5}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Category Image *
  </label>

  <label
    htmlFor="category-image"
    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-7 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
  >
    <ImagePlus size={30} className="mb-2 text-indigo-600" />

    <span className="text-sm font-bold text-slate-700">
      Choose Category Image
    </span>

    <span className="mt-1 text-xs text-slate-400">
      JPG, PNG, WEBP or AVIF · Maximum 5 MB
    </span>

    <input
      id="category-image"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif"
      onChange={handleImageChange}
      className="hidden"
    />
  </label>

  {selectedFile && (
    <p className="mt-2 truncate text-xs text-slate-500">
      Selected: {selectedFile.name}
    </p>
  )}

  {previewUrl && (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <img
        src={previewUrl}
        alt="Category preview"
        className="h-44 w-full object-cover"
      />
    </div>
  )}

  {selectedFile && (
    <button
      type="button"
      onClick={handleImageUpload}
      disabled={uploading}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      {uploading ? (
        <Loader2 size={17} className="animate-spin" />
      ) : (
        <UploadCloud size={17} />
      )}
      {uploading ? "Uploading..." : "Upload Image"}
    </button>
  )}

  {form.image && !selectedFile && (
    <p className="mt-2 text-xs font-semibold text-emerald-600">
      Image uploaded successfully
    </p>
  )}
</div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Active Category
                </span>
              </label>

              {form.image && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={form.image}
                    alt="Category preview"
                    className="h-40 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : editingId ? (
                  <Save size={18} />
                ) : (
                  <FolderPlus size={18} />
                )}

                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Category"
                    : "Create Category"}
              </button>
            </form>
          </section>

          {/* Category List */}
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                All Categories
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the categories available in your store.
              </p>
            </div>

            {categories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                <Layers className="mx-auto text-slate-300" size={36} />
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  No categories created yet.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Create your first category using the form.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_30px_-22px_rgba(79,70,229,0.45)] sm:flex-row sm:items-center"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {category.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        /{category.slug}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {category.description}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          category.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(category)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                      >
                        {category.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(category)}
                        aria-label={`Edit ${category.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        aria-label={`Delete ${category.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
