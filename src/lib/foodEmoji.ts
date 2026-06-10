// Picks a representative emoji for a dish from its name/description.
//
// Vision onboarding extracts text, not photos, so products have no image_url.
// Rather than show the same placeholder for every item, we map common food
// keywords (FR + EN) to an emoji. Falls back to a neutral plate.

const KEYWORD_EMOJI: [RegExp, string][] = [
  [/pizza/, '🍕'],
  [/burger|hamburger|cheeseburger/, '🍔'],
  [/frite|fries|chips/, '🍟'],
  [/salade|salad/, '🥗'],
  [/sandwich|panini|wrap/, '🥪'],
  [/taco|burrito|fajita/, '🌮'],
  [/sushi|maki|sashimi/, '🍣'],
  [/p[aâ]tes|pasta|spaghetti|lasagne|nouille|noodle/, '🍝'],
  [/poulet|chicken|aile|wings/, '🍗'],
  [/steak|b[œoe]uf|beef|viande|grill/, '🥩'],
  [/poisson|fish|saumon|salmon|thon|tuna/, '🐟'],
  [/crevette|shrimp|gamba|fruits de mer|seafood/, '🦐'],
  [/riz|rice/, '🍚'],
  [/soupe|soup|potage|bouillon/, '🍲'],
  [/[œoe]uf|egg|omelette/, '🍳'],
  [/fromage|cheese/, '🧀'],
  [/g[aâ]teau|cake|tarte|p[aâ]tisserie|pastry/, '🍰'],
  [/glace|ice ?cream|sorbet/, '🍨'],
  [/cr[eê]pe|pancake|gaufre|waffle/, '🥞'],
  [/caf[eé]|coffee|expresso|espresso|cappuccino/, '☕'],
  [/th[eé]\b|tea/, '🍵'],
  [/bi[eè]re|beer/, '🍺'],
  [/vin|wine/, '🍷'],
  [/cocktail|mojito/, '🍹'],
  [/jus|juice|smoothie/, '🧃'],
  [/eau|water/, '💧'],
  [/coca|soda|limonade|lemonade|fanta|sprite|boisson|drink/, '🥤'],
  [/lait|milk|milkshake/, '🥛'],
  [/pain|bread|baguette/, '🥖'],
  [/croissant|viennoiserie/, '🥐'],
  [/pomme|apple|banane|banana|fruit/, '🍎'],
  [/l[eé]gume|vegetable|brocoli/, '🥦'],
  [/hot ?dog/, '🌭'],
  [/kebab|brochette|skewer/, '🍢'],
];

/** Returns an emoji that best matches the dish name, or a plate by default. */
export function foodEmoji(name: string, description?: string): string {
  const text = `${name} ${description ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip accents
  for (const [re, emoji] of KEYWORD_EMOJI) {
    if (re.test(text)) return emoji;
  }
  return '🍽️';
}
