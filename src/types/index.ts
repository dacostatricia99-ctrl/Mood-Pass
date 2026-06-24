export interface Establishment {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  currency: string;
}

/** Per-language overrides stored as JSONB, e.g. { fr: "...", en: "..." }. */
export type LocalizedField = Partial<Record<string, string>>;

export interface Category {
  id: string;
  establishment_id: string;
  name: string;
  name_i18n?: LocalizedField;
  display_order: number;
}

export interface Product {
  id: string;
  establishment_id: string;
  category_id: string;
  name: string;
  description?: string;
  name_i18n?: LocalizedField;
  description_i18n?: LocalizedField;
  price: number;
  image_url?: string;
  is_available: boolean;
  featured?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}
