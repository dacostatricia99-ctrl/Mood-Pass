import { supabase } from './supabase';

export interface OnboardingResult {
  slug: string;
  categoryCount: number;
  productCount: number;
}

/** Turns an establishment name into a URL-safe slug. */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return base || 'menu';
}

interface VisionMenu {
  categories?: { products?: unknown[] }[];
}

/**
 * Full onboarding flow against the backend:
 *   1. create the establishment owned by the current user,
 *   2. upload the menu image to Storage,
 *   3. call the Vision Edge Function to extract + translate + persist the menu.
 *
 * Requires a configured Supabase client and an authenticated session.
 */
export async function generateMenuFromImage(params: { name: string; file: File }): Promise<OnboardingResult> {
  const { name, file } = params;
  if (!supabase) throw new Error('Supabase is not configured');

  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) throw new Error('Not authenticated');

  // One establishment per manager. Reuse the existing one if any — this makes
  // retries idempotent: a failed generation never leaves an orphan, and
  // clicking "Generate" again updates the same establishment instead of
  // creating duplicates.
  let establishmentId = '';
  let slug = '';

  const { data: mine } = await supabase
    .from('establishments')
    .select('id, slug')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (mine && mine.length > 0) {
    establishmentId = mine[0].id;
    slug = mine[0].slug;
    await supabase.from('establishments').update({ name }).eq('id', establishmentId);
    // Replace the previous menu rather than append to it (best-effort: skipped
    // if a product is referenced by an existing order).
    await supabase.from('categories').delete().eq('establishment_id', establishmentId);
  } else {
    // Create a new establishment, retrying on slug collisions.
    const baseSlug = slugify(name);
    for (let attempt = 0; attempt < 4; attempt++) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from('establishments')
        .insert({ name, slug: candidate, owner_id: ownerId })
        .select('id, slug')
        .single();
      if (!error && data) {
        establishmentId = data.id;
        slug = data.slug;
        break;
      }
      if (error && error.code !== '23505') throw error;
    }
    if (!establishmentId) throw new Error('Could not create establishment (slug unavailable)');
  }

  // 2. Upload the menu image to the public "menus" bucket.
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${establishmentId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('menus').upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from('menus').getPublicUrl(path);

  // 3. Vision: extract, translate and persist the menu.
  const { data: visionData, error: visionError } = await supabase.functions.invoke('mood-vision-onboarding', {
    body: { image_url: publicUrl.publicUrl, establishment_id: establishmentId },
  });
  if (visionError) throw visionError;

  const menu = (visionData?.menu ?? {}) as VisionMenu;
  const categories = menu.categories ?? [];
  const productCount = categories.reduce((sum, c) => sum + (c.products?.length ?? 0), 0);

  return { slug, categoryCount: categories.length, productCount };
}
