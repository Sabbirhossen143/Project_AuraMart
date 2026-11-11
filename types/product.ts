
export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  discountPercent?: number;
  stock: number;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecord extends Product {
  PK: string;
  SK: string;
  entityType: "PRODUCT";

  GSI1PK: string;
  GSI1SK: string;

  GSI2PK: string;
  GSI2SK: string;
}
