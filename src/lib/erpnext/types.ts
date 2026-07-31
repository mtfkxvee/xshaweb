export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  alt: string;
};

export type ItemGroup = {
  name: string;
  label: string;
  parent: string | null;
};

export type Outlet = {
  code: string;
  name: string;
  city: string | null;
  territory: string | null;
};

export type Customer = {
  id: string;
  name: string;
  group: string | null;
  mobile: string | null;
  email: string | null;
  loyaltyProgram: string | null;
};

export type CurrentUser = {
  email: string;
  customer: Customer | null;
};

export type OrderLine = {
  itemCode: string;
  itemName: string;
  qty: number;
  rate: number;
};

export type Order = {
  id: string;
  date: string;
  status: string;
  total: number;
};

export type LoyaltyStatus = {
  points: number;
  level: string | null;
  loyaltyProgram: string | null;
};
