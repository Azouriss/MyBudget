import type { ExpenseSubcategory } from './subcategories';

// Aliases describe purchase labels, not external services. A provider offering
// multiple services deliberately appears in multiple rows.
export const expenseAliases: Readonly<Record<string, readonly string[]>> = {
  'food-groceries': ['courses', 'carrefour', 'leclerc', 'auchan', 'lidl', 'aldi', 'intermarche', 'super u', 'monoprix', 'franprix'],
  'food-delivery': ['uber eats', 'deliveroo', 'just eat', 'livraison repas'],
  'food-fast-food': ['mcdonald', 'mcdo', 'burger king', 'kfc'],
  'food-meal-kits': ['hellofresh', 'hello fresh'],
  'food-drinks': ['jus orange', 'jus d orange'],
  'housing-electricity': ['edf', 'engie', 'electricite'],
  'housing-gas': ['edf', 'engie', 'gaz'],
  'housing-internet': ['orange', 'sosh', 'sfr', 'red by sfr', 'bouygues', 'free', 'b and you', 'b&you', 'livebox', 'freebox', 'bbox', 'sfr box', 'wifi', 'wi fi', 'fibre', 'adsl', 'box internet'],
  'other-expense-mobile': ['orange', 'sosh', 'sfr', 'red by sfr', 'bouygues', 'free', 'b and you', 'b&you', 'forfait mobile', 'forfait telephone', 'telephone', 'telephonique', 'free mobile', 'orange mobile', 'sfr mobile', 'sim', 'esim', '4g', '5g', 'la poste mobile', 'nrj mobile', 'prixtel', 'reglomobile', 'lebara', 'lycamobile'],
  'other-expense-landline': ['telephone fixe', 'ligne fixe'],
  'other-expense-phone-device': ['achat telephone', 'achat smartphone', 'achat iphone', 'coque telephone', 'chargeur telephone'],
  'transport-public': ['ratp', 'navigo', 'ticket metro', 'carte bus'],
  'transport-train': ['sncf', 'ouigo', 'tgv', 'ter'],
  'transport-taxi': ['uber', 'bolt', 'heetch', 'taxi'],
  'transport-carpool': ['blablacar'],
  'transport-tolls': ['ulys', 'bip and go', 'telepeage'],
  'transport-inspection': ['controle technique', 'contre visite'],
  'leisure-video': ['netflix', 'disney', 'disney plus', 'prime video', 'amazon prime video', 'canal plus', 'appletv', 'apple tv', 'max video'],
  'leisure-music': ['spotify', 'deezer', 'apple music', 'youtube music', 'amazon music', 'tidal', 'qobuz'],
  'leisure-cloud': ['icloud', 'google one', 'onedrive', 'dropbox', 'pcloud'],
  'leisure-gaming': ['game pass', 'xbox game pass', 'playstation plus', 'ps plus', 'nintendo online'],
  'leisure-sport': ['basic fit', 'fitness park', 'keep cool', 'salle sport'],
  'leisure-holidays': ['airbnb', 'booking', 'hotel', 'camping'],
  'leisure-podcasts': ['audible'],
  'health-pharmacy': ['pharmacie', 'medicament'],
  'health-insurance': ['mutuelle sante', 'complementaire sante'],
  'other-expense-pet-insurance': ['assurance animaux', 'mutuelle animaux', 'assurance chien', 'assurance chat'],
  'housing-insurance': ['assurance habitation', 'assurance maison'],
  'transport-insurance': ['assurance auto', 'assurance voiture', 'assurance moto'],
};

const stopWords = new Set(('a au aux avec ce ces cet cette chez d de des du en et l la le les ma mes mon pour un une ' +
  'paiement achat facture abonnement prelevement mensuel mensuelle annuel annuelle mois an par sur ' +
  'the my for and of bill subscription payment').split(' '));
const genericWords = new Set(['abonnement', 'forfait', 'assurance', 'cotisation', 'recharge', 'box', 'carte',
  'orange', 'sosh', 'sfr', 'free', 'bouygues', 'edf', 'engie']);

export function normalizeExpenseText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
}

function words(text: string): string[] {
  return [...new Set(normalizeExpenseText(text).split(' ').filter((word) =>
    word.length >= 2 && !stopWords.has(word) && !/^\d+$/.test(word)))];
}

// One insertion, deletion, substitution or transposition, on longer search
// words only. Approximate matches never drive automatic classification.
function closeWord(a: string, b: string): boolean {
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (a[i] === b[i] && i < Math.min(a.length, b.length)) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1)
      || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

export function createExpenseSearchIndex(entries: readonly ExpenseSubcategory[], translate: (text: string) => string) {
  const rows = entries.filter((entry) => entry.id !== 'housing-phone').map((entry) => {
    const aliases = expenseAliases[entry.id] ?? [];
    const tokens = words(`${entry.label} ${translate(entry.label)} ${entry.keywords} ${aliases.join(' ')}`);
    return { entry, tokens, aliases: aliases.map(normalizeExpenseText) };
  });
  const frequencies = new Map<string, number>();
  rows.forEach((row) => row.tokens.forEach((token) => frequencies.set(token, (frequencies.get(token) ?? 0) + 1)));

  return (query: string, categories: readonly { id: string; label: string }[], approximate: boolean) => {
    const normalized = normalizeExpenseText(query);
    const queryWords = words(query);
    if (!queryWords.length) return [];
    const labels = new Map(categories.map((category) => [category.id,
      words(`${category.label} ${translate(category.label)}`)]));
    return rows.filter(({ entry }) => labels.has(entry.categoryId)).map(({ entry, tokens, aliases }) => {
      let score = 0;
      let matched = 0;
      let specific = false;
      for (const word of queryWords) {
        const exact = tokens.includes(word);
        const prefix = approximate && word.length >= 3 && tokens.some((token) => token.startsWith(word));
        const fuzzy = approximate && !prefix && tokens.some((token) => closeWord(word, token));
        if (exact || prefix || fuzzy) {
          const weight = genericWords.has(word) ? 0.3 : 1 + Math.log2(rows.length / (frequencies.get(word) ?? rows.length));
          score += weight * (exact ? 1 : prefix ? 0.65 : 0.35);
          matched++;
          if (exact && !genericWords.has(word) && (frequencies.get(word) ?? 0) <= 5) specific = true;
        } else if (labels.get(entry.categoryId)?.includes(word)) {
          score += 0.2;
          matched++;
        }
      }
      // Full aliases beat broad overlapping catalogue keywords, e.g. Uber Eats,
      // a mobile plan, a fixed line or a streaming service.
      const phrase = Math.max(0, ...aliases.filter((alias) => ` ${normalized} `.includes(` ${alias} `))
        .map((alias) => alias.split(' ').length));
      if (phrase) score += phrase * 3;
      return { entry, score, matched, specific, coverage: matched / queryWords.length };
    }).filter((result) => result.matched > 0)
      .sort((a, b) => b.score - a.score || b.coverage - a.coverage || a.entry.id.localeCompare(b.entry.id));
  };
}
