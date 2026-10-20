import { t } from '../../i18n/locale';
import { createExpenseSearchIndex, normalizeExpenseText } from './matching';

export type ExpenseSubcategory = {
  id: string;
  categoryId: string;
  label: string;
  keywords: string;
};

// Stable bundled IDs are also stored on transactions and recurring rules.
function group(categoryId: string, entries: readonly (readonly [string, string, string])[]): ExpenseSubcategory[] {
  return entries.map(([id, label, keywords]) => ({ id: `${categoryId}-${id}`, categoryId, label, keywords }));
}

export const expenseSubcategories: readonly ExpenseSubcategory[] = [
  ...group('food', [
    ['groceries', 'Courses alimentaires', 'supermarché épicerie alimentation'],
    ['bakery', 'Boulangerie', 'pain viennoiserie pâtisserie'],
    ['butcher', 'Boucherie et charcuterie', 'viande traiteur'],
    ['fish', 'Poissonnerie', 'poisson fruits de mer'],
    ['produce', 'Fruits et légumes', 'marché primeur panier bio'],
    ['restaurant', 'Restaurant', 'repas déjeuner dîner sortie'],
    ['fast-food', 'Restauration rapide', 'fast food burger kebab sandwich pizza'],
    ['delivery', 'Livraison de repas', 'commande nourriture domicile'],
    ['canteen', 'Cantine', 'restaurant entreprise scolaire repas'],
    ['coffee', 'Café et salon de thé', 'boisson goûter petit déjeuner'],
    ['drinks', 'Boissons', 'eau jus soda alcool vin bière'],
    ['snacks', 'Snacks et confiseries', 'bonbons chocolat grignotage'],
    ['frozen', 'Surgelés', 'congelé plats préparés'],
    ['specialty', 'Épicerie spécialisée', 'bio vrac diététique produits du monde'],
    ['meal-kits', 'Paniers et kits repas', 'box cuisine ingrédients abonnement'],
    ['baby', 'Alimentation bébé', 'lait infantile petits pots compote bébé'],
    ['catering', 'Traiteur et repas de fête', 'buffet réception traiteur événement'],
    ['supplements', 'Compléments alimentaires', 'protéines vitamines nutrition compléments'],
  ]),
  ...group('housing', [
    ['rent', 'Loyer', 'location logement habitation'],
    ['mortgage', 'Crédit immobilier', 'prêt emprunt maison appartement'],
    ['fees', 'Charges de copropriété', 'syndic immeuble'],
    ['electricity', 'Électricité', 'énergie facture courant'],
    ['gas', 'Gaz', 'énergie chaudière'],
    ['water', 'Eau', 'facture distribution assainissement'],
    ['heating', 'Chauffage', 'fioul bois granulés énergie'],
    ['insurance', 'Assurance habitation', 'maison appartement'],
    ['internet', 'Internet et box', 'fibre adsl wifi abonnement connexion'],
    // Historical ID remains valid for saved transactions and backups.
    ['phone', 'Téléphone', 'mobile forfait abonnement portable'],
    ['furniture', 'Meubles et décoration', 'mobilier canapé lit rideaux'],
    ['appliances', 'Électroménager', 'réfrigérateur lave linge four aspirateur'],
    ['repairs', 'Travaux et réparations', 'bricolage entretien plombier électricien'],
    ['cleaning', 'Entretien ménager', 'ménage lessive nettoyage produits maison'],
    ['garden', 'Jardin et extérieur', 'plantes balcon outillage jardinage'],
    ['security', 'Alarme et télésurveillance', 'alarme sécurité télésurveillance habitation'],
    ['moving', 'Déménagement', 'déménageur cartons garde meuble'],
    ['laundry', 'Laverie et pressing', 'blanchisserie nettoyage vêtements laverie pressing'],
    ['property-tax', 'Taxe foncière', 'impôt foncier propriété'],
    ['waste', 'Déchets et ordures ménagères', 'redevance déchets ordures déchetterie'],
  ]),
  ...group('transport', [
    ['fuel', 'Carburant', 'essence diesel gazole e85 station plein'],
    ['charging', 'Recharge électrique', 'borne voiture batterie'],
    ['public', 'Transports en commun', 'bus métro tramway abonnement titre ticket'],
    ['train', 'Train', 'sncf tgv ter billet trajet'],
    ['taxi', 'Taxi et VTC', 'chauffeur course uber'],
    ['carpool', 'Covoiturage', 'trajet partagé blablacar'],
    ['parking', 'Stationnement', 'parking parcmètre garage'],
    ['tolls', 'Péages', 'autoroute télépéage'],
    ['insurance', 'Assurance véhicule', 'auto voiture moto scooter'],
    ['maintenance', 'Entretien du véhicule', 'réparation garage vidange pneus contrôle technique'],
    ['rental', 'Location de véhicule', 'voiture utilitaire autopartage'],
    ['loan', 'Crédit et leasing auto', 'prêt loa lld mensualité voiture'],
    ['bike', 'Vélo et trottinette', 'cycle réparation location mobilité'],
    ['air', 'Avion', 'vol billet aéroport bagage'],
    ['equipment', 'Équipements et accessoires', 'casque antivol siège auto gilet'],
    ['inspection', 'Contrôle technique', 'contrôle technique automobile contre visite'],
    ['washing', 'Lavage auto', 'lavage nettoyage voiture station'],
    ['license', 'Permis et auto-école', 'permis conduire conduite code auto école'],
    ['registration', 'Carte grise', 'immatriculation certificat véhicule'],
    ['fines', 'Amendes de transport', 'amende stationnement contravention radar'],
  ]),
  ...group('leisure', [
    ['streaming', 'Abonnement streaming', 'vidéo musique netflix spotify disney télévision'],
    ['cinema', 'Cinéma', 'film séance billet'],
    ['shows', 'Concerts et spectacles', 'théâtre festival musique sortie'],
    ['books', 'Livres et presse', 'lecture magazine journal abonnement librairie'],
    ['games', 'Jeux vidéo', 'console steam abonnement gaming'],
    ['board-games', 'Jeux de société', 'puzzle cartes jouets'],
    ['sport', 'Sport et salle de sport', 'fitness club piscine abonnement gym'],
    ['hobbies', 'Loisirs créatifs', 'dessin peinture couture photo matériel'],
    ['museums', 'Musées et visites', 'exposition monument culture'],
    ['holidays', 'Hébergement de vacances', 'hôtel camping location voyage séjour'],
    ['activities', 'Excursions et activités', 'parc attraction tourisme randonnée'],
    ['outings', 'Bars et sorties', 'pub discothèque soirée'],
    ['classes', 'Cours et ateliers', 'danse musique cuisine apprentissage'],
    ['equipment', 'Équipement de loisirs', 'sport instrument appareil photo'],
    ['apps', 'Applications et logiciels', 'licence abonnement numérique cloud'],
    ['video', 'Streaming vidéo', 'vidéo séries films netflix disney prime video'],
    ['music', 'Streaming musical', 'musique spotify deezer apple music youtube music'],
    ['cloud', 'Stockage en ligne', 'stockage sauvegarde cloud icloud onedrive dropbox google one'],
    ['gaming', 'Abonnements de jeux vidéo', 'game pass playstation plus nintendo online gaming'],
    ['podcasts', 'Livres audio et podcasts', 'audible livre audio podcast'],
    ['membership', 'Adhésions de loisirs', 'adhésion association loisirs cotisation club'],
  ]),
  ...group('health', [
    ['pharmacy', 'Pharmacie', 'médicament ordonnance parapharmacie'],
    ['doctor', 'Médecin généraliste', 'consultation docteur visite'],
    ['specialist', 'Médecin spécialiste', 'dermatologue cardiologue gynécologue'],
    ['dental', 'Dentiste', 'dentaire orthodontie dents'],
    ['optics', 'Optique', 'lunettes lentilles ophtalmologue'],
    ['insurance', 'Mutuelle santé', 'complémentaire assurance cotisation'],
    ['hospital', 'Hôpital et clinique', 'hospitalisation urgences chirurgie'],
    ['tests', 'Analyses et examens', 'laboratoire radiologie imagerie prise de sang'],
    ['physio', 'Kinésithérapie', 'kiné rééducation séances'],
    ['mental', 'Psychologue et thérapie', 'psy santé mentale consultation'],
    ['osteo', 'Ostéopathie', 'ostéo chiropraxie'],
    ['equipment', 'Matériel médical', 'appareil orthopédie prothèse auditif'],
    ['nursing', 'Soins infirmiers', 'infirmier domicile pansement'],
    ['wellbeing', 'Bien-être', 'massage relaxation cure'],
    ['prevention', 'Prévention et vaccination', 'vaccin bilan dépistage'],
    ['speech', 'Orthophonie', 'orthophoniste langage parole rééducation'],
    ['podiatry', 'Podologie', 'podologue pédicure semelles pieds'],
    ['nutrition', 'Diététique et nutrition', 'diététicien nutritionniste consultation'],
    ['transport', 'Transport médical', 'ambulance vsl taxi conventionné'],
  ]),
  ...group('other-expense', [
    ['clothing', 'Vêtements et chaussures', 'habillement mode textile accessoires'],
    ['beauty', 'Coiffure et beauté', 'coiffeur cosmétique esthétique maquillage'],
    ['childcare', 'Garde d’enfants', 'crèche nounou babysitting périscolaire'],
    ['school', 'Scolarité et fournitures', 'école études université formation cahier'],
    ['pets', 'Alimentation et accessoires animaux', 'chat chien croquettes litière animalerie'],
    ['vet', 'Vétérinaire', 'animal animaux soins chat chien'],
    ['gifts', 'Cadeaux', 'anniversaire noël fête mariage'],
    ['charity', 'Dons et associations', 'solidarité caritatif cotisation'],
    ['taxes', 'Impôts et taxes', 'fiscalité revenu foncier prélèvement'],
    ['bank', 'Frais bancaires', 'banque carte agios commission'],
    ['loan', 'Crédit à la consommation', 'prêt remboursement mensualité dette'],
    ['electronics', 'Informatique et électronique', 'ordinateur smartphone tablette matériel'],
    ['postage', 'Courrier et colis', 'poste timbre envoi livraison'],
    ['administration', 'Démarches administratives', 'passeport carte identité document'],
    ['services', 'Services et assistance', 'aide prestation conseil honoraires'],
    ['mobile', 'Forfait mobile', 'téléphone téléphonie mobile portable forfait sim esim recharge prépayée 4g 5g'],
    ['landline', 'Téléphone fixe', 'téléphonie ligne fixe abonnement'],
    ['phone-device', 'Téléphone et accessoires', 'achat smartphone téléphone iphone samsung chargeur coque'],
    ['pet-insurance', 'Assurance animaux', 'assurance mutuelle animaux chat chien'],
    ['pet-care', 'Garde et toilettage animaux', 'pension garde toilettage animaux chat chien'],
    ['school-trips', 'Sorties et voyages scolaires', 'sortie voyage scolaire classe découverte'],
    ['tuition', 'Soutien scolaire', 'soutien scolaire cours particuliers tutorat'],
    ['pocket-money', 'Argent de poche', 'argent poche enfants'],
    ['baby', 'Puériculture', 'couches poussette biberon lit bébé'],
    ['legal', 'Frais juridiques', 'avocat notaire huissier justice honoraires'],
    ['insurance', 'Assurances personnelles', 'responsabilité civile protection juridique prévoyance'],
    ['professional', 'Frais professionnels', 'frais professionnel travail bureau déplacement'],
  ]),
];

const byId = new Map(expenseSubcategories.map((subcategory) => [subcategory.id, subcategory]));

export function getExpenseSubcategory(id?: string | null): ExpenseSubcategory | undefined {
  return id ? byId.get(id) : undefined;
}

export function isValidExpenseSubcategory(value: { kind: string; categoryId: string; subcategoryId?: string | null }): boolean {
  return value.subcategoryId == null || (value.kind === 'expense'
    && getExpenseSubcategory(value.subcategoryId)?.categoryId === value.categoryId);
}

export function normalizeCategorySearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/œ/g, 'oe').trim();
}

let searchSignature = '';
let searchIndex: ReturnType<typeof createExpenseSearchIndex> | undefined;

function getSearchIndex() {
  // Reuse normalized tokens and token frequencies across keystrokes. Rebuild
  // when translated catalogue labels change, not when the selected section does.
  const signature = expenseSubcategories.map((entry) => t(entry.label)).join('|');
  if (!searchIndex || signature !== searchSignature) {
    searchIndex = createExpenseSearchIndex(expenseSubcategories, t);
    searchSignature = signature;
  }
  return searchIndex;
}

// Search across available sections; choosing a result also chooses its parent.
export function searchExpenseSubcategories(query: string, categoryId: string, categories: readonly { id: string; label: string }[]): ExpenseSubcategory[] {
  const normalized = normalizeExpenseText(query);
  const available = new Set(categories.map((category) => category.id));
  if (!normalized) return expenseSubcategories.filter((entry) =>
    entry.id !== 'housing-phone' && entry.categoryId === categoryId && available.has(entry.categoryId));
  const ranked = getSearchIndex()(query, categories, true);
  if (ranked.length) {
    const complete = ranked.filter((result) => result.coverage === 1);
    return (complete.length ? complete : ranked.filter((result) => result.coverage >= 0.5))
      .map((result) => result.entry);
  }
  // Generic catalogue searches remain useful, but never auto-classify a label.
  if (!['abonnement', 'abonnements', 'facture'].includes(normalized)) return [];
  return expenseSubcategories.filter((entry) => entry.id !== 'housing-phone' && available.has(entry.categoryId)
    && normalizeExpenseText(`${entry.label} ${entry.keywords}`).includes(normalized.replace(/s$/, '')));
}

export function detectExpenseSubcategory(label: string, categories: readonly { id: string; label: string }[]): ExpenseSubcategory | undefined {
  const [first, second] = getSearchIndex()(label, categories, false);
  // Refuse unknown words, weak evidence and competing interpretations.
  if (!first || !first.specific || first.coverage < 1 || first.score < 5
    || (second && first.score - second.score < 2.5)) return undefined;
  return first.entry;
}
