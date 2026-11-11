"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Loader2,
  Save,
  Upload,
  X,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  discountPercent?: number;
  stock: number;
  categoryId: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";

function EditProductContent() {
  const router = useRouter();
  const { toast } = useToast();
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [pageLoading, setPageLoading] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !categoryMenuRef.current?.contains(target)) {
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
          throw new Error(authResult.message || "Unable to verify account.");
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

        const [productResponse, categoryResponse] = await Promise.all([
          fetch(`/api/products?id=${encodeURIComponent(productId)}`, {
            cache: "no-store",
          }),
          fetch("/api/categories", { cache: "no-store" }),
        ]);

        const productResult = await productResponse.json();
        const categoryResult = await categoryResponse.json();

        if (!productResponse.ok) {
          throw new Error(productResult.message || "Unable to load product.");
        }
        if (!categoryResponse.ok) {
          throw new Error(
            categoryResult.message || "Unable to load categories.",
          );
        }

        const product: Product = productResult.data;
        const categoryList = Array.isArray(categoryResult.data)
          ? categoryResult.data
          : categoryResult.data?.items ?? [];

        if (!active) return;

        setName(product.name ?? "");
        setDescription(product.description ?? "");
        setPrice(String(product.price ?? ""));
        setDiscountPercent(String(product.discountPercent ?? 0));
        setStock(String(product.stock ?? ""));
        setCategoryId(product.categoryId ?? "");
        setImageUrl(product.imageUrl ?? "");
        setCategories(
          categoryList.filter((category: Category) => category.isActive),
        );
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

    if (productId) initializePage();

    return () => {
      active = false;
    };
  }, [productId, router, toast]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, WEBP and AVIF images are allowed.");
      toast.error("Only JPG, PNG, WEBP and AVIF images are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Image size must be between 1 byte and 5 MB.");
      toast.error("Image size must be between 1 byte and 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setImageUrl("");
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleImageUpload() {
    if (!selectedFile) {
      setError("Please select an image first.");
      toast.warning("Please select an image first.");
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
      setSuccess("New image uploaded. Save changes to apply it.");
      toast.success("Image uploaded. Save changes to apply it.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Image upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

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

      const discount = Number(discountPercent);
      if (
        !Number.isInteger(discount) ||
        discount < 0 ||
        discount > 99
      ) {
        throw new Error("Discount must be a whole number between 0 and 99.");
      }

      const productData = {
        name: name.trim(),
        description: description.trim(),
        imageUrl,
        price: Number(price),
        discountPercent: discount,
        stock: Number(stock),
        categoryId,
      };

      const response = await fetch(
        `/api/products?id=${encodeURIComponent(productId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Product update failed.");
      }

      setSuccess("Product updated successfully!");
      toast.success("Product updated successfully!");
      setSelectedFile(null);
      setPreviewUrl("");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update product.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const displayedImage = previewUrl || imageUrl;

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
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),_transparent_42%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/account"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft size={17} />
            Back to Account
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/70"><ImagePlus size={23} /></div>
            <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Edit Product
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Update product details, pricing, inventory and product image.
          </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-700 shadow-sm">
            <X size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-700 shadow-sm">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="relative rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Product Information</h2><p className="mt-1 text-xs text-slate-400">Manage the essential details of this product</p></div>
              <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700">Details</span>
            </div>

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
                  required
                  minLength={2}
                  className={inputClass}
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
                  required
                  minLength={10}
                  rows={4}
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="grid gap-5 grid-cols-2">
                <div>
                  <label htmlFor="product-price" className="mb-2 block text-sm font-semibold text-slate-700">Price (BDT) *</label>
                  <input id="product-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0.01" step="0.01" required className={inputClass} />
                </div>
                <div>
                  <label htmlFor="product-stock" className="mb-2 block text-sm font-semibold text-slate-700">Stock Quantity *</label>
                  <input id="product-stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" step="1" required className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 items-start gap-3 sm:gap-5">
                <div className="min-w-0">
                  <label htmlFor="product-discount" className="mb-2 block text-sm font-semibold text-slate-700">Discount (%)</label>
                  <input id="product-discount" type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} min="0" max="99" step="1" className={inputClass} />
                  <p className="mt-1.5 text-xs text-slate-400">0 = No discount</p>
                </div>

                <div className="relative z-40 min-w-0" ref={categoryMenuRef}>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Product Category *</label>
                  <button
                    type="button"
                    id="product-category"
                    aria-haspopup="listbox"
                    aria-expanded={categoryOpen}
                    onClick={() => setCategoryOpen((open) => !open)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-3 text-left text-sm shadow-sm outline-none transition-all duration-200 focus:ring-4 sm:px-4 ${categoryOpen ? "border-indigo-400 ring-4 ring-indigo-100" : "border-slate-200 hover:border-indigo-300 hover:shadow-md"}`}
                  >
                    <span className={`min-w-0 truncate font-medium ${categoryId ? "text-slate-800" : "text-slate-400"}`}>
                      {categories.find((category) => category.id === categoryId)?.name ?? "Select category"}
                    </span>
                    <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform duration-200 ${categoryOpen ? "rotate-180 text-indigo-600" : ""}`} />
                  </button>
                  {categoryOpen && (
                    <div role="listbox" aria-label="Product categories" className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-[0_20px_55px_-15px_rgba(15,23,42,0.30)] ring-1 ring-black/[0.04]">
                      {categories.length ? categories.map((category) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={categoryId === category.id}
                          key={category.id}
                          onClick={() => { setCategoryId(category.id); setCategoryOpen(false); }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${categoryId === category.id ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}
                        >
                          <span className="truncate">{category.name}</span>
                          {categoryId === category.id && <CheckCircle2 size={16} className="ml-2 shrink-0 text-indigo-600" />}
                        </button>
                      )) : <p className="px-3 py-3 text-sm text-slate-400">No active categories available</p>}
                    </div>
                  )}
                </div>
              </div>

              {Number(discountPercent) > 0 &&
                Number(price) > 0 &&
                Number(discountPercent) <= 99 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-bold text-emerald-800">
                      {discountPercent}% OFF
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Discounted price:{" "}
                      <strong>
                        ৳
                        {(
                          Number(price) *
                          (1 - Number(discountPercent) / 100)
                        ).toLocaleString("en-BD", {
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </p>
                  </div>
                )}

            </div>
          </section>

          <section className="relative rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:p-7">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Product Image</h2>
            <p className="mt-1 text-sm text-slate-500">Keep the current image or upload a replacement.</p></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">Media</span></div>

            <div className="mt-5 rounded-2xl border-2 border-dashed border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/70 p-5 shadow-inner sm:p-7">
              {displayedImage ? (
                <div className="relative mx-auto max-w-md overflow-hidden rounded-xl bg-white shadow-sm">
                  <img
                    src={displayedImage}
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
                        "product-image",
                      ) as HTMLInputElement | null;
                      if (input) input.value = "";
                    }}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-md hover:bg-red-50"
                    aria-label="Remove product image"
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
                    Choose a replacement image
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, WEBP or AVIF · Maximum 5 MB
                  </p>
                  <span className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
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
                        Image Uploaded
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
              If you select a new image, upload it before saving changes.
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/account"
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
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
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function EditProductPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading product...
        </div>
      }
    >
      <EditProductContent />
    </Suspense>
  );
}