import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { localizeItems } from "../_shared/i18n.ts"

const openAiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { query, establishment_id } = await req.json()

    if (!query) throw new Error('Query is required')

    // 1. Call OpenAI to parse the natural language query into an action
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // or gpt-4o for speed/cost
        messages: [
          {
            role: 'system',
            content: `Tu es l'assistant de gestion d'un établissement. 
            Ton but est d'analyser la requête du gérant et de retourner une action JSON stricte.
            Actions possibles : 'ADD_PRODUCT', 'REMOVE_PRODUCT', 'UPDATE_PRICE', 'TOGGLE_AVAILABILITY'.
            Exemple de retour attendu : {"action": "ADD_PRODUCT", "details": {"name": "Burger", "price": 5000}}`
          },
          { role: 'user', content: query }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await openAiResponse.json();
    const actionIntent = JSON.parse(aiData.choices[0].message.content);

    // 2. Init Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // 3. Execute the mapped action on the database
    let dbResult = null;
    let replyText = "Je n'ai pas pu exécuter cette action.";

    if (actionIntent.action === 'ADD_PRODUCT') {
      // Translate the new product into all supported languages before storing.
      const [localized] = await localizeItems(
        [{ name: actionIntent.details.name, description: actionIntent.details.description }],
        openAiApiKey,
      );

      const { data, error } = await supabase
        .from('products')
        .insert({
          establishment_id,
          name: actionIntent.details.name,
          description: actionIntent.details.description ?? null,
          price: actionIntent.details.price,
          name_i18n: localized.name_i18n,
          description_i18n: localized.description_i18n,
          // category_id should be matched or created here in a real scenario
        })
        .select()

      if (error) throw error;
      replyText = `Le produit "${actionIntent.details.name}" a été ajouté à ${actionIntent.details.price} FCFA.`;
      dbResult = data;
    }
    // Add other cases (UPDATE_PRICE, etc.) here
    else {
      replyText = `L'action ${actionIntent.action} a été reconnue mais n'est pas encore implémentée dans ce MVP.`;
    }

    return new Response(
      JSON.stringify({ success: true, reply: replyText, data: dbResult }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }, status: 400 },
    )
  }
})
