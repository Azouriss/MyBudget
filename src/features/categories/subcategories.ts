import { t } from '../../i18n/locale';

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
    ['phone', 'Téléphone', 'mobile forfait abonnement portable'],
    ['furniture', 'Meubles et décoration', 'mobilier canapé lit rideaux'],
    ['appliances', 'Électroménager', 'réfrigérateur lave linge four aspirateur'],
    ['repairs', 'Travaux et réparations', 'bricolage entretien plombier électricien'],
    ['cleaning', 'Entretien ménager', 'ménage lessive nettoyage produits maison'],
    ['garden', 'Jardin et extérieur', 'plantes balcon outillage jardinage'],
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

// A typed query searches every section; the empty query suggests the active section.
export function searchExpenseSubcategories(query: string, categoryId: string, categories: readonly { id: string; label: string }[]): ExpenseSubcategory[] {
  const words = normalizeCategorySearch(query).split(/\s+/).filter(Boolean);
  const labels = new Map(categories.map((category) => [category.id, category.label]));
  return expenseSubcategories.filter((subcategory) => {
    if (!labels.has(subcategory.categoryId)) return false;
    if (!words.length) return subcategory.categoryId === categoryId;
    const category = labels.get(subcategory.categoryId) ?? '';
    const text = normalizeCategorySearch(`${subcategory.label} ${t(subcategory.label)} ${subcategory.keywords} ${category} ${t(category)}`);
    return words.every((word) => text.includes(word));
  });
}
