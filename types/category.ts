export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord extends Category {
  PK: string;
  SK: string;
  entityType: "CATEGORY";
}