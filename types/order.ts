export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: "COD";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  orderStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRecord extends Order {
  PK: string;
  SK: string;
  entityType: "ORDER";
  GSI1PK: string;
  GSI1SK: string;
}