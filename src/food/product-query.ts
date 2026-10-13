/**
 * Turns what the user typed into product searches: a full-text match for the local index,
 * and, until that has downloaded, Open Food Facts search queries (Lucene syntax, see
 * https://search.openfoodfacts.org/docs). Plain words are only scored, and any one of them
 * matching is enough, so "sainsbury's bacon and brie" alone returns every bacon rasher.
 * Instead every word must appear in the product's name or brand, with the plain words
 * kept for ranking.
 */

const UK = 'countries_tags:"en:united-kingdom"';

/** Words product names write as "&" or leave out. */
const FILLER = new Set(['and', 'with', 'the', 'of', 'in', 'on', 'a', 'an', 'for']);

/** Supermarkets, whose own-label products often have no brand on Open Food Facts. */
const SHOPS = new Set(['sainsburys', 'sainsbury', 'tesco', 'asda', 'morrisons', 'waitrose', 'm&s', 'marks', 'spencer', 'spencers', 'co-op', 'coop', 'lidl', 'aldi', 'iceland', 'ocado']);

/**
 * Words the way scripts/build-products.py indexes products: lower case, accents and
 * apostrophes dropped, "m&s" as "ms", split on anything that isn't a letter or digit.
 */
export function indexTerms(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`']/g, '')
    .replace(/([a-z0-9])&(?=[a-z0-9])/g, '$1')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** A full-text match for the local product index: every word typed, each as a word prefix. */
export function indexMatch(query: string): string | null {
  const typed = indexTerms(query).filter((t) => !FILLER.has(t));
  const useful = typed.filter((t) => t.length > 1);
  const chosen = useful.length > 0 ? useful : typed;
  return chosen.length > 0 ? chosen.map((t) => `"${t}"*`).join(' ') : null;
}

function words(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .split(/[^a-z0-9&'-]+/)
    .map((w) => w.replace(/^['&-]+|['&-]+$/g, ''))
    .filter((w) => w.length > 1 && !FILLER.has(w));
}

/** Brands are matched as typed, and written "Sainsbury's", "Sainsburys" and "Sainsbury’s". */
function brandSpellings(word: string): string[] {
  const base = word.endsWith("'s") ? word.slice(0, -2) : word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : null;
  return base ? [...new Set([word, `${base}s`, `${base}'s`, `${base}’s`])] : [word];
}

function mustMatch(word: string): string {
  return `(${[`product_name.en:"${word}"`, ...brandSpellings(word).map((b) => `brands:"${b}"`)].join(' OR ')})`;
}

/**
 * Queries to try in order until one finds something: every word required, then supermarket
 * names only used for ranking. Empty when nothing searchable was typed.
 */
export function productQueries(query: string): string[] {
  const all = words(query);
  if (all.length === 0) return [];
  const rank = all.join(' ');
  const strict = (required: string[]) => `${rank} ${[...required.map(mustMatch), UK].join(' AND ')}`;
  const queries = [strict(all)];
  const notShops = all.filter((w) => !SHOPS.has(w.replace("'", '')));
  if (notShops.length > 0 && notShops.length < all.length) queries.push(strict(notShops));
  return queries;
}
