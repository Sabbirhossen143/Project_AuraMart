
export interface GuestCartItem {
  productId: string;
  quantity: number;
}

const GUEST_CART_KEY = "auramart-guest-cart";

export function getGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const storedCart = localStorage.getItem(GUEST_CART_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  } catch {
    return [];
  }
}

export function saveGuestCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function addToGuestCart(
  productId: string,
  quantity = 1
): GuestCartItem[] {
  const cart = getGuestCart();
  const existingItem = cart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ productId, quantity });
  }

  saveGuestCart(cart);
  return cart;
}

export function updateGuestCartQuantity(
  productId: string,
  quantity: number
): GuestCartItem[] {
  const cart = getGuestCart()
    .map((item) =>
      item.productId === productId ? { ...item, quantity } : item
    )
    .filter((item) => item.quantity > 0);

  saveGuestCart(cart);
  return cart;
}

export function removeFromGuestCart(
  productId: string
): GuestCartItem[] {
  const cart = getGuestCart().filter(
    (item) => item.productId !== productId
  );

  saveGuestCart(cart);
  return cart;
}

export function clearGuestCart(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(GUEST_CART_KEY);
}
