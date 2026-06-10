import type { Category, LocalizedField, Product } from '../types';
import type { Language } from './translations';

interface LocalizedProductText {
  name: string;
  description: string;
}

// Demo categories. Their ids match the mock products' category_id so the
// category filter works without a backend.
export const mockCategories: Category[] = [
  {
    id: 'c1',
    establishment_id: 'e1',
    name: 'Plats',
    name_i18n: { fr: 'Plats', en: 'Mains', ar: 'الأطباق', pt: 'Pratos', zh: '主菜' },
    display_order: 0,
  },
  {
    id: 'c2',
    establishment_id: 'e1',
    name: 'Boissons',
    name_i18n: { fr: 'Boissons', en: 'Drinks', ar: 'مشروبات', pt: 'Bebidas', zh: '饮料' },
    display_order: 1,
  },
];

/** Resolves a JSONB i18n field for a language, falling back to the canonical text. */
export function localizeText(
  i18n: LocalizedField | undefined,
  language: Language,
  fallback: string,
): string {
  return i18n?.[language] ?? fallback;
}

// Canonical product list (French names/descriptions act as the fallback).
export const mockProducts: Product[] = [
  {
    id: 'p1',
    establishment_id: 'e1',
    category_id: 'c1',
    name: 'Burger Royal',
    description: 'Double bœuf grillé, cheddar coulant, bacon croustillant, sauce secrète.',
    price: 4500,
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300&h=300',
    is_available: true,
  },
  {
    id: 'p2',
    establishment_id: 'e1',
    category_id: 'c1',
    name: 'Pizza Diabola',
    description: 'Sauce tomate, mozzarella, pepperoni piquant, piments frais.',
    price: 6000,
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=300&h=300',
    is_available: true,
  },
  {
    id: 'p3',
    establishment_id: 'e1',
    category_id: 'c2',
    name: 'Cocktail Sunrise',
    description: "Jus d'orange pressé, grenadine, mangue fraîche.",
    price: 3000,
    image_url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=300&h=300',
    is_available: true,
  },
];

// Per-product translations keyed by product id, then language.
// The product's own (French) name/description is used as the fallback.
const productTranslations: Record<string, Partial<Record<Language, LocalizedProductText>>> = {
  p1: {
    en: { name: 'Royal Burger', description: 'Double grilled beef, melted cheddar, crispy bacon, secret sauce.' },
    ar: { name: 'برغر رويال', description: 'لحم بقري مشوي مزدوج، شيدر ذائب، لحم مقدد مقرمش، صلصة سرية.' },
    pt: { name: 'Burger Royal', description: 'Duplo bife grelhado, cheddar derretido, bacon crocante, molho secreto.' },
    zh: { name: '皇家汉堡', description: '双层烤牛肉、融化的切达奶酪、香脆培根、秘制酱汁。' },
  },
  p2: {
    en: { name: 'Diabola Pizza', description: 'Tomato sauce, mozzarella, spicy pepperoni, fresh chili peppers.' },
    ar: { name: 'بيتزا ديابولا', description: 'صلصة طماطم، موزاريلا، بيبروني حار، فلفل حار طازج.' },
    pt: { name: 'Pizza Diabola', description: 'Molho de tomate, mozzarella, pepperoni picante, malaguetas frescas.' },
    zh: { name: '香辣披萨', description: '番茄酱、马苏里拉奶酪、辣味意大利香肠、新鲜辣椒。' },
  },
  p3: {
    en: { name: 'Sunrise Cocktail', description: 'Freshly squeezed orange juice, grenadine, fresh mango.' },
    ar: { name: 'كوكتيل صنرايز', description: 'عصير برتقال طازج، شراب الرمان، مانجو طازجة.' },
    pt: { name: 'Cocktail Sunrise', description: 'Sumo de laranja espremido na hora, granadina, manga fresca.' },
    zh: { name: '日出鸡尾酒', description: '鲜榨橙汁、石榴糖浆、新鲜芒果。' },
  },
};

/**
 * Returns the localized name/description for a product, with this precedence:
 *   1. DB i18n columns (`name_i18n` / `description_i18n`) — real products,
 *   2. the local mock dictionary (demo products without a backend),
 *   3. the canonical fallback name/description.
 */
export function localizeProductText(
  product: Pick<Product, 'id' | 'name' | 'description' | 'name_i18n' | 'description_i18n'>,
  language: Language,
): LocalizedProductText {
  const mock = productTranslations[product.id]?.[language];
  return {
    name: product.name_i18n?.[language] ?? mock?.name ?? product.name,
    description:
      product.description_i18n?.[language] ?? mock?.description ?? product.description ?? '',
  };
}

/** Returns a copy of a product with its name/description translated into the given language. */
export function localizeProduct(product: Product, language: Language): Product {
  const { name, description } = localizeProductText(product, language);
  return { ...product, name, description };
}
