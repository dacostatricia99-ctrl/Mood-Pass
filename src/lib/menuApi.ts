import type { Category, Product } from '../types';
import { supabase } from './supabase';
import { mockCategories, mockProducts } from '../i18n/menuData';

export interface EstablishmentMenu {
  name: string | null;
  categories: Category[];
  products: Product[];
  currency: string;
  mobileMoneyEnabled: boolean;
  source: 'remote' | 'mock';
}

const MOCK_MENU: EstablishmentMenu = {
  name: null,
  categories: mockCategories,
  products: mockProducts,
  currency: 'FCFA',
  mobileMoneyEnabled: false,
  source: 'mock',
};

/**
 * Loads an establishment's categories and products by slug.
 *
 * Falls back to the bundled demo menu when Supabase is not configured, the
 * establishment is unknown, or it has no products yet — so the menu always
 * renders something. The `source` field tells the caller which path was taken.
 */
export async function fetchEstablishmentMenu(slug: string | undefined): Promise<EstablishmentMenu> {
  if (!supabase || !slug) {
    return MOCK_MENU;
  }

  // 1. Resolve the establishment from its slug.
  const { data: establishment, error: estError } = await supabase
    .from('establishments')
    .select('id, name, currency, mobile_money_enabled')
    .eq('slug', slug)
    .maybeSingle();

  if (estError || !establishment) {
    return MOCK_MENU;
  }

  // 2. Load its categories and available products (including the i18n columns).
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from('categories')
      .select('id, establishment_id, name, name_i18n, display_order')
      .eq('establishment_id', establishment.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, establishment_id, category_id, name, description, name_i18n, description_i18n, price, image_url, is_available')
      .eq('establishment_id', establishment.id)
      .eq('is_available', true)
      .order('created_at', { ascending: true }),
  ]);

  const products = productsResult.data;
  if (productsResult.error || !products || products.length === 0) {
    return MOCK_MENU;
  }

  return {
    name: ((establishment as { name?: string }).name) ?? null,
    categories: (categoriesResult.data as Category[]) ?? [],
    products: products as Product[],
    currency: (establishment.currency as string) ?? 'FCFA',
    mobileMoneyEnabled: Boolean((establishment as { mobile_money_enabled?: boolean }).mobile_money_enabled),
    source: 'remote',
  };
}
