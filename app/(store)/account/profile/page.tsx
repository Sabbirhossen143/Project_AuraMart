"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  AtSign,
  ChevronRight,
  LockKeyhole,
  Loader2,
  MapPin,
  PencilLine,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  ImagePlus,
  X,
} from "lucide-react";

interface AccountProfile {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  profileImage?: string;
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

export default function AccountProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Bangladesh");
  const [profileImage, setProfileImage] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load profile information."
        );
      }

      const user = result.data?.user ?? result.data ?? result.user;

      if (!user || typeof user !== "object") {
        throw new Error("Account profile not found.");
      }

      const normalizedUser: AccountProfile = {
        ...user,
        name: typeof user.name === "string" ? user.name : "",
        email: typeof user.email === "string" ? user.email : "",
        role: user.role === "ADMIN" ? "ADMIN" : "USER",
        isActive: Boolean(user.isActive),
        createdAt:
          typeof user.createdAt === "string" ? user.createdAt : "",
        phone: typeof user.phone === "string" ? user.phone : "",
        address: typeof user.address === "string" ? user.address : "",
        city: typeof user.city === "string" ? user.city : "",
        postalCode:
          typeof user.postalCode === "string" ? user.postalCode : "",
        country:
          typeof user.country === "string"
            ? user.country
            : "Bangladesh",
        profileImage:
          typeof user.profileImage === "string" ? user.profileImage : "",
      };

      setProfile(normalizedUser);
      setName(normalizedUser.name);
      setPhone(normalizedUser.phone ?? "");
      setAddress(normalizedUser.address ?? "");
      setCity(normalizedUser.city ?? "");
      setPostalCode(normalizedUser.postalCode ?? "");
      setCountry(normalizedUser.country ?? "Bangladesh");
      setProfileImage(normalizedUser.profileImage ?? "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load profile."
      );
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleImageChange(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    try {
      setImageProcessing(true);
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Unable to read image."));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error("Invalid image file."));
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const maxSize = 256;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext("2d");
            if (!context) return reject(new Error("Image processing is unavailable."));
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.78));
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });

      if (imageData.length > 230 * 1024) {
        throw new Error("Image is too large after compression. Choose another image.");
      }

      setProfileImage(imageData);
      toast.success("Profile photo ready. Save changes to upload it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image processing failed.");
    } finally {
      setImageProcessing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      toast.warning("Please enter your full name.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          profileImage,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Profile update failed.");
      }

      const updated = result.data ?? {
        ...profile,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        profileImage,
      };

      setProfile(updated);

      toast.success("Your profile information has been updated.");
      router.push("/account");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="animate-spin text-indigo-600" size={21} />
          <span className="text-sm font-semibold text-slate-600">
            Loading profile...
          </span>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <UserRound className="mx-auto text-indigo-500" size={40} />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Profile unavailable
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please try again or return to your account dashboard.
          </p>

          <button
            onClick={() => void loadProfile()}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const initials = profile.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.10),_transparent_42%),linear-gradient(180deg,#f8faff_0%,#f1f5f9_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="transition hover:text-indigo-600">
            Home
          </Link>

          <ChevronRight size={15} />

          <Link
            href="/account"
            className="transition hover:text-indigo-600"
          >
            My Account
          </Link>

          <ChevronRight size={15} />

          <span className="font-semibold text-slate-800">
            Profile Information
          </span>
        </nav>

        <Link
          href="/account"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-indigo-600"
        >
          <ArrowLeft size={17} />
          Back to Account
        </Link>

        {/* Profile Header */}
        <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-indigo-200/60 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-black shadow-inner">
                {initials || <UserRound size={26} />}
              </div>

              <div>
                <p className="text-sm font-medium text-indigo-100">
                  Account settings
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  Profile Information
                </h1>

                <p className="mt-1 text-sm text-indigo-100">
                  View and update your personal details
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-50">
              <ShieldCheck size={15} />
              {profile.isActive ? "Active account" : "Inactive account"}
            </span>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_55px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                  Personal Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Edit the information associated with your account
                </p>
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <PencilLine size={20} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 border-b border-slate-100 px-5 py-6 sm:flex-row sm:px-7">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-indigo-50 text-xl font-bold text-indigo-600">
                {profileImage ? (
                  <img src={profileImage} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  initials || <UserRound size={26} />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-sm font-bold text-slate-800">Profile Photo</h3>
                <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP. Maximum 5 MB; automatically resized.</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100">
                    {imageProcessing ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                    {imageProcessing ? "Processing..." : "Choose Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={imageProcessing}
                      onChange={(event) => {
                        void handleImageChange(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {profileImage && (
                    <button
                      type="button"
                      onClick={() => setProfileImage("")}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      <X size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
              {/* Name */}
              <div className="sm:col-span-2">
                <label htmlFor="profile-name" className={labelClass}>
                  Full Name <span className="text-rose-500">*</span>
                </label>

                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  className={fieldClass}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email - Read Only */}
              <div>
                <label htmlFor="profile-email" className={labelClass}>
                  Email Address
                </label>

                <div className="relative">
                  <AtSign
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="profile-email"
                    value={profile.email}
                    readOnly
                    disabled
                    className={`${fieldClass} cursor-not-allowed bg-slate-50 pl-10 text-slate-500`}
                  />

                  <LockKeyhole
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Email address cannot be changed.
                </p>
              </div>

              {/* Role - Read Only */}
              <div>
                <label htmlFor="profile-role" className={labelClass}>
                  Account Role
                </label>

                <div className="relative">
                  <ShieldCheck
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="profile-role"
                    value={profile.role}
                    readOnly
                    disabled
                    className={`${fieldClass} cursor-not-allowed bg-slate-50 pl-10 text-slate-500`}
                  />

                  <LockKeyhole
                    size={15}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Account role is managed by the administrator.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="profile-phone" className={labelClass}>
                  Phone Number
                </label>

                <div className="relative">
                  <Phone
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={24}
                    className={`${fieldClass} pl-10`}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label htmlFor="profile-country" className={labelClass}>
                  Country
                </label>

                <input
                  id="profile-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  maxLength={60}
                  className={fieldClass}
                  placeholder="Country"
                />
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label htmlFor="profile-address" className={labelClass}>
                  Street Address
                </label>

                <div className="relative">
                  <MapPin
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                  />

                  <textarea
                    id="profile-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    maxLength={240}
                    rows={3}
                    className={`${fieldClass} resize-y pl-10`}
                    placeholder="House, road, area..."
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label htmlFor="profile-city" className={labelClass}>
                  City
                </label>

                <input
                  id="profile-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  maxLength={80}
                  className={fieldClass}
                  placeholder="City"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label htmlFor="profile-postal" className={labelClass}>
                  Postal Code
                </label>

                <input
                  id="profile-postal"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  maxLength={20}
                  className={fieldClass}
                  placeholder="Postal code"
                />
              </div>
            </div>
          </section>

          {/* Save Actions */}
          <section className="flex flex-col-reverse gap-3 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">
              <LockKeyhole size={15} className="shrink-0 text-slate-400" />
              Email and account role are protected and cannot be edited here.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}