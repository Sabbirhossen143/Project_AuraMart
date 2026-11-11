
"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Loader2,
  PackagePlus,
  Upload,
  X,
  Sparkles,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export default function NewProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Close the category menu when clicking outside or pressing Escape.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !categoryMenuRef.current?.contains(event.target)
      ) {
        setCategoryOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCategoryOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Check Admin access and load categories
  useEffect(() => {
    let active = true;

    async function initializePage() {
      try {
        const authResponse = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (authResponse.status === 401) {
          router.replace("/login");
          return;
        }

        const authResult = await authResponse.json();

        if (!authResponse.ok) {
          throw new Error(
            authResult.message || "Unable to verify account."
          );
        }

        const user =
          authResult.data?.user ??
          authResult.data ??
          authResult.user ??
          authResult;

        if (user.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        if (!active) return;

        setAdminAllowed(true);

        const categoryResponse = await fetch("/api/categories", {
          cache: "no-store",
        });

        const categoryResult = await categoryResponse.json();

        if (!categoryResponse.ok) {
          throw new Error(
            categoryResult.message || "Unable to load categories."
          );
        }

        const categoryList = Array.isArray(categoryResult.data)
          ? categoryResult.data
          : categoryResult.data?.items ?? [];

        if (active) {
          setCategories(
            categoryList.filter((category: Category) => category.isActive)
          );
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : "Something went wrong.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) setPageLoading(false);
      }
    }

    initializePage();

    return () => {
      active = false;
    };
  }, [router, toast]);

  // Clean up image preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Select image from computer
  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      const message = "Only JPG, PNG, WEBP and AVIF images are allowed.";
      setError(message);
      toast.error(message);
      event.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      const message = "Image size must be between 1 byte and 5 MB.";
      setError(message);
      toast.error(message);
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setImageUrl("");
    setPreviewUrl(URL.createObjectURL(file));
  }

  // Upload image to Cloudinary
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

      setImageUrl(uploadedUrl);
      setSuccess("Image uploaded successfully!");
      toast.success("Product image uploaded successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  // Create product
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!name.trim() || !description.trim() || !categoryId) {
        throw new Error("Please fill in all required fields.");
      }

      if (selectedFile && !imageUrl) {
        throw new Error("Please upload the selected image first.");
      }

      const discountValue = Number(discountPercent);
      if (
        !Number.isInteger(discountValue) ||
        discountValue < 0 ||
        discountValue > 99
      ) {
        throw new Error("Discount must be a whole number between 0 and 99.");
      }

      const productData = {
        name: name.trim(),
        description: description.trim(),
        imageUrl,
        price: Number(price),
        discountPercent: Number(discountPercent),
        stock: Number(stock),
        categoryId,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Product creation failed.");
      }

      const successMessage = `Product created successfully! Product ID: ${result.data.id}`;
      setSuccess(successMessage);
      toast.success("Product created successfully.");

      setName("");
      setDescription("");
      setPrice("");
      setDiscountPercent("0");
      setStock("");
      setCategoryId("");
      setSelectedFile(null);
      setImageUrl("");
      setPreviewUrl("");
      setError("");

      const fileInput = document.getElementById(
        "product-image"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create product.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <Loader2 size={35} className="animate-spin text-indigo-600" />
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
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to Account
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/70">
              <PackagePlus size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
                Add New Product
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create a product for your AuraMart store.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm sm:inline-flex">
              <Sparkles size={14} />
              Store product setup
            </div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span className="break-all">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Product Information */}
          <section className="relative z-30 overflow-visible rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 sm:p-7">
            <h2 className="mb-6 text-lg font-bold text-slate-900">
              Product Information
            </h2>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="product-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Product Name *
                </label>

                <input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter product name"
                  required
                  minLength={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/70"
                />
              </div>

              <div>
                <label
                  htmlFor="product-description"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Description *
                </label>

                <textarea
                  id="product-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your product..."
                  required
                  minLength={10}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/70"
                />
              </div>

              <div className="grid gap-5 grid-cols-2">
                <div>
                  <label
                    htmlFor="product-price"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Price (BDT) *
                  </label>

                  <input
                    id="product-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2500"
                    min="0.01"
                    step="0.01"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/70"
                  />
                </div>

                <div>
                  <label
                    htmlFor="product-stock"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Stock Quantity *
                  </label>

                  <input
                    id="product-stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="50"
                    min="0"
                    step="1"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/70"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
              <div>
                <label
                  htmlFor="product-discount"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Discount Percentage (%)
                </label>

                <div className="relative">
                  <input
                    id="product-discount"
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="99"
                    step="1"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    %
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Optional. Set 0 for no discount, or enter 1–99 to offer a discount.
                </p>
              </div>

              <div ref={categoryMenuRef} className="relative z-50">
  <label
    htmlFor="product-category"
    className="mb-2 block text-sm font-semibold text-slate-700"
  >
    Product Category *
  </label>

  <button
    id="product-category"
    type="button"
    onClick={() => setCategoryOpen((prev) => !prev)}
    aria-expanded={categoryOpen}
    aria-haspopup="listbox"
    disabled={categories.length === 0}
    className={`group flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3.5 text-left text-sm shadow-sm transition-all duration-200 ${
      categoryOpen
        ? "border-indigo-400 shadow-md shadow-indigo-100/70 ring-4 ring-indigo-100/80"
        : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
    } disabled:cursor-not-allowed disabled:bg-slate-50`}
  >
    <span
      className={
        categoryId
          ? "font-semibold text-slate-800"
          : "text-slate-400"
      }
    >
      {categories.find((category) => category.id === categoryId)?.name ||
        "Choose a product category"}
    </span>

    <ChevronDown
      size={19}
      className={`text-slate-400 transition-transform duration-200 ${
        categoryOpen ? "rotate-180 text-indigo-600" : ""
      }`}
    />
  </button>

  {categoryOpen && categories.length > 0 && (
    <div
      role="listbox"
      className="absolute left-0 right-0 z-[100] mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_22px_55px_-18px_rgba(15,23,42,0.32)] ring-1 ring-black/[0.03] animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Available Categories
      </p>

      {categories.map((category) => {
        const isSelected = categoryId === category.id;

        return (
          <button
            key={category.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => {
              setCategoryId(category.id);
              setCategoryOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition-all duration-150 ${
              isSelected
                ? "bg-gradient-to-r from-indigo-50 to-violet-50 font-semibold text-indigo-700"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>{category.name}</span>

            {isSelected && (
              <Check size={18} className="text-indigo-600" />
            )}
          </button>
        );
      })}
    </div>
  )}

  {categories.length === 0 && (
    <p className="mt-2 text-xs text-amber-600">
      No active categories found. Create an active category first.
    </p>
  )}

  <p className="mt-2 text-xs text-slate-400">
    Select the category that best matches your product.
  </p>
</div>
              </div>
            </div>
          </section>

          {/* Product Image */}
          <section className="relative z-0 overflow-visible rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 sm:p-7">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Product Image
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select an image from your computer and upload it to Cloudinary.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-5 sm:p-7">

              {previewUrl ? (
                <div className="relative mx-auto max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
                  <img
                    src={previewUrl}
                    alt="Product preview"
                    className="max-h-72 w-full object-contain"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl("");
                      setImageUrl("");

                      const input = document.getElementById(
                        "product-image"
                      ) as HTMLInputElement | null;

                      if (input) input.value = "";
                    }}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-md hover:bg-red-50"
                    aria-label="Remove selected image"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="product-image"
                  className="flex cursor-pointer flex-col items-center justify-center py-8 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                    <ImagePlus size={30} />
                  </div>

                  <p className="mt-4 font-bold text-slate-800">
                    Choose an image from your computer
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, WEBP or AVIF · Maximum 5 MB
                  </p>

                  <span className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                    Choose Image
                  </span>
                </label>
              )}

              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleImageChange}
                className="hidden"
              />

              {selectedFile && (
                <div className="mx-auto mt-5 max-w-md rounded-xl bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <span
                      className={`text-xs font-bold ${
                        imageUrl ? "text-green-600" : "text-amber-600"
                      }`}
                    >
                      {imageUrl ? "Uploaded" : "Not uploaded"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={uploading || Boolean(imageUrl)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading Image...
                      </>
                    ) : imageUrl ? (
                      <>
                        <CheckCircle2 size={18} />
                        Image Uploaded Successfully
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Upload to Cloudinary
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              Image upload is optional. If you select an image, upload it before
              creating the product.
            </p>
          </section>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/account"
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || uploading || categories.length === 0}
              className="premium-button flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Product...
                </>
              ) : (
                <>
                  <PackagePlus size={18} />
                  Create Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </main>
  );
}
