export interface GuestWishlistItem {
  productId: string;
  addedAt: string;
}

const GUEST_WISHLIST_KEY = "auramart-guest-wishlist";

export function getGuestWishlist(): GuestWishlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveGuestWishlist(items: GuestWishlistItem[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
}

export function addToGuestWishlist(productId: string): GuestWishlistItem[] {
  const items = getGuestWishlist();

  if (!items.some((item) => item.productId === productId)) {
    items.push({
      productId,
      addedAt: new Date().toISOString(),
    });
  }

  saveGuestWishlist(items);
  return items;
}

export function removeFromGuestWishlist(
  productId: string
): GuestWishlistItem[] {
  const items = getGuestWishlist().filter(
    (item) => item.productId !== productId
  );

  saveGuestWishlist(items);
  return items;
}

export function clearGuestWishlist(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(GUEST_WISHLIST_KEY);
}