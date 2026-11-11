
export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
}

export interface CartRecord extends CartItem {
  PK: string;
  SK: string;
  entityType: "CART";
}

export interface CartProductDetails {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

export interface CartItemWithProduct extends CartItem {
  product: CartProductDetails;
  subtotal: number;
}

export interface CartSummary {
  items: CartItemWithProduct[];
  totalItems: number;
  totalPrice: number;
}
