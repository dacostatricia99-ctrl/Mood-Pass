import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { localizeItems } from "../_shared/i18n.ts"

const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedProduct {
  name: string;
  description?: string;
  price: number;
}

interface ExtractedCategory {
  name: string;
  products: ExtractedProduct[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // In a real app, the client uploads the image to Supabase Storage and passes
    // the public URL here. `establishment_id` enables persisting the menu.
    const body = await req.json()
    const { establishment_id } = body
    // Accept a single image_url (legacy) or an array of image_urls (PDF pages).
    const images: string[] = Array.isArray(body.image_urls) && body.image_urls.length > 0
      ? body.image_urls
      : (body.image_url ? [body.image_url] : [])

    if (images.length === 0) throw new Error('image_url(s) required')

    // 1. Vision: parse the image into structured JSON (canonical language).
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Tu es un OCR expert pour menus de restaurant. Les images fournies sont une ou plusieurs pages d'UN MÊME menu. TRANSCRIS EXACTEMENT tout le menu (toutes les pages), sans rien inventer.

RÈGLES STRICTES :
- Recopie CHAQUE produit visible, sans en omettre ni en ajouter. N'invente jamais un produit, un prix ou une description.
- Garde les noms et descriptions EXACTEMENT tels qu'écrits (même langue, même orthographe, mêmes accents). Ne traduis pas, ne reformule pas.
- Prix : nombre exact tel qu'imprimé (sans le symbole de devise). Si un produit a plusieurs prix (tailles), prends le premier. Si aucun prix n'est lisible, mets 0.
- Respecte les catégories/sections telles qu'écrites sur le menu. Si aucune catégorie n'est visible, mets tout dans une catégorie "Menu".
- Description : uniquement si elle est écrite sur le menu, sinon chaîne vide.
- Si un texte est illisible, ignore-le plutôt que de deviner.

Renvoie STRICTEMENT ce JSON :
{
  "establishment_name": "Nom si visible, sinon vide",
  "categories": [
    { "name": "Nom exact de la section", "products": [ { "name": "Nom exact", "description": "Description si écrite sinon \\"\\"", "price": 1000 } ] }
  ]
}`
              },
              ...images.map((url: string) => ({
                type: 'image_url',
                image_url: { url, detail: 'high' },
              })),
            ]
          }
        ],
        max_tokens: 4096,
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await openAiResponse.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const extractedMenu = JSON.parse(aiData.choices[0].message.content);
    const categories: ExtractedCategory[] = extractedMenu.categories ?? [];

    // 2. Translate every category name and every product into all languages.
    const categoryNames = categories.map((c) => ({ name: c.name }));
    const allProducts = categories.flatMap((c) => c.products ?? []);

    const [localizedCategories, localizedProducts] = await Promise.all([
      localizeItems(categoryNames, openAiApiKey),
      localizeItems(allProducts, openAiApiKey),
    ]);

    // Stitch translations back onto the menu structure.
    let productCursor = 0;
    const enrichedMenu = {
      ...extractedMenu,
      categories: categories.map((category, ci) => {
        const products = (category.products ?? []).map((product) => {
          const loc = localizedProducts[productCursor++];
          return {
            ...product,
            name_i18n: loc.name_i18n,
            description_i18n: loc.description_i18n,
          };
        });
        return {
          ...category,
          name_i18n: localizedCategories[ci].name_i18n,
          products,
        };
      }),
    };

    // 3. Persist to the database when an establishment is provided.
    let persisted = false;
    if (establishment_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
      );

      for (const [order, category] of enrichedMenu.categories.entries()) {
        const { data: catRow, error: catError } = await supabase
          .from('categories')
          .insert({
            establishment_id,
            name: category.name,
            name_i18n: category.name_i18n,
            display_order: order,
          })
          .select('id')
          .single();

        if (catError) throw catError;

        const rows = (category.products ?? []).map((p: ExtractedProduct & { name_i18n: Record<string, string>; description_i18n: Record<string, string> }) => ({
          establishment_id,
          category_id: catRow.id,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          name_i18n: p.name_i18n,
          description_i18n: p.description_i18n,
        }));

        if (rows.length > 0) {
          const { error: prodError } = await supabase.from('products').insert(rows);
          if (prodError) throw prodError;
        }
      }
      persisted = true;
    }

    return new Response(
      JSON.stringify({ success: true, persisted, menu: enrichedMenu }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 },
    )
  }
})
