import { supabase } from './supabase';
import { pdfToImageBlobs } from './pdfToImages';

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

  // 2. Build the page image(s): a PDF is rasterised to one image per page,
  //    an image is used as-is. OpenAI Vision only reads images.
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const blobs: Blob[] = isPdf ? await pdfToImageBlobs(file) : [file];
  if (blobs.length === 0) throw new Error('Could not read the menu file');

  // 3. Upload each page and collect its public URL.
  const imageUrls: string[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const ext = isPdf ? 'jpg' : (file.name.split('.').pop()?.toLowerCase() || 'jpg');
    const path = `${establishmentId}/${Date.now()}-${i}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('menus')
      .upload(path, blobs[i], { upsert: true, contentType: blobs[i].type || 'image/jpeg' });
    if (uploadError) throw uploadError;
    imageUrls.push(supabase.storage.from('menus').getPublicUrl(path).data.publicUrl);
  }

  // 4. Vision: extract, translate and persist the menu (all pages at once).
  const { data: visionData, error: visionError } = await supabase.functions.invoke('mood-vision-onboarding', {
    body: { image_urls: imageUrls, establishment_id: establishmentId },
  });
  if (visionError) throw visionError;

  const menu = (visionData?.menu ?? {}) as VisionMenu;
  const categories = menu.categories ?? [];
  const productCount = categories.reduce((sum, c) => sum + (c.products?.length ?? 0), 0);

  return { slug, categoryCount: categories.length, productCount };
}
