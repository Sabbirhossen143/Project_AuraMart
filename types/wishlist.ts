export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export interface WishlistRecord extends WishlistItem {
  PK: string;
  SK: string;
  entityType: "WISHLIST";
}