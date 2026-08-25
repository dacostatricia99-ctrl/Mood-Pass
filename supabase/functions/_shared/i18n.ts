// Shared i18n helpers for MoodPass Edge Functions.
//
// Keep this list in sync with the frontend (src/i18n/translations.ts).
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar', 'pt', 'zh'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'French',
  en: 'English',
  ar: 'Arabic',
  pt: 'Portuguese',
  zh: 'Simplified Chinese',
};

export interface TranslatableItem {
  name: string;
  description?: string | null;
}

export interface LocalizedItem extends TranslatableItem {
  name_i18n: Record<string, string>;
  description_i18n: Record<string, string>;
}

/**
 * Translates a batch of menu items into every supported language in a single
 * OpenAI call. Order is preserved; on any failure the items are returned with
 * empty i18n maps so the caller can still persist the canonical text.
 */
export async function localizeItems(
  items: TranslatableItem[],
  openAiApiKey: string | undefined,
): Promise<LocalizedItem[]> {
  const empty = (it: TranslatableItem): LocalizedItem => ({
    ...it,
    name_i18n: {},
    description_i18n: {},
  });

  if (!openAiApiKey || items.length === 0) {
    return items.map(empty);
  }

  const targetList = SUPPORTED_LANGUAGES.map((code) => `"${code}" (${LANGUAGE_NAMES[code]})`).join(', ');

  const prompt = `You are a professional menu translator for a restaurant app.
Translate each item's "name" and "description" into ALL of these languages: ${targetList}.
Keep proper nouns / brand names unchanged. Keep it concise and appetizing.
Return STRICT JSON only, preserving the input order, in this exact shape:
{
  "items": [
    {
      "name_i18n": { "fr": "...", "en": "...", "ar": "...", "pt": "...", "zh": "..." },
      "description_i18n": { "fr": "...", "en": "...", "ar": "...", "pt": "...", "zh": "..." }
    }
  ]
}
If an item has no description, return an empty string for every description_i18n value.

Items to translate:
${JSON.stringify(items.map((it) => ({ name: it.name, description: it.description ?? '' })))}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // translation is simple + high-volume; favor the cheaper model
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const parsed = JSON.parse(data.choices[0].message.content);
    const translated: Array<{ name_i18n?: Record<string, string>; description_i18n?: Record<string, string> }> =
      parsed.items ?? [];

    return items.map((it, idx) => ({
      ...it,
      name_i18n: translated[idx]?.name_i18n ?? {},
      description_i18n: translated[idx]?.description_i18n ?? {},
    }));
  } catch {
    // Never block the write on a translation failure — store canonical text only.
    return items.map(empty);
  }
}
