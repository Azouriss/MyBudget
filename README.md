<p align="center">
  <img src="assets/readme/banner.svg" alt="Mon Budget — Le calme dans vos comptes. Hors ligne, sans compte, Android et web." width="1200" />
</p>

<p align="center">
  Suivez vos dépenses. Donnez un cap à votre budget.<br />
  <strong>Vos finances restent sur votre appareil.</strong>
</p>

## Aperçus

<p align="center">
  <img src="assets/readme/preview-dashboard.svg" alt="Accueil : bilan mensuel et répartition des dépenses par catégorie." width="250" />
  <img src="assets/readme/preview-history.svg" alt="Historique : transactions, filtres et recherche." width="250" />
  <img src="assets/readme/preview-budgets.svg" alt="Budgets : limite mensuelle et enveloppes par catégorie." width="250" />
</p>

<p align="center"><sub>Aperçus illustrés en SVG · données fictives · ce ne sont pas des captures d’écran.</sub></p>

| Votre quotidien | Dans Mon Budget |
| :--- | :--- |
| Suivre | Dépenses, revenus, recherche et bilan mensuel. |
| Prévoir | Budget global et limites par catégorie. |
| Anticiper | Dépenses récurrentes et rappel local du jour de paie sur Android. |
| Garder la main | Sans compte, sans backend, sans télémétrie. Données SQLite locales. |

## Démarrer

**Node.js ≥ 22.13 · npm**

```sh
npm ci
npm run web
```

Ouvrir l’URL locale affichée. Le navigateur et le téléphone conservent des bases séparées.
Pour Android : `npm start`, puis Expo Go compatible SDK 57 ou un émulateur.
Sous WSL avec des dépendances Windows, lancer npm depuis PowerShell Windows.

<details>
<summary>Vérifier le projet et compiler un APK</summary>

```sh
npm run check
npm run release:check
npm run build:android:local
```

La compilation locale requiert Windows, un JDK 17 et le SDK Android adapté.
L’APK signé est produit dans `dist/`. Conserver en privé `credentials.json`
ainsi que la clé et l’état de compilation dans `signing/`.

Pour mettre à jour une installation, conserver le même identifiant Android et la
même clé, augmenter le numéro interne et tester l’installation par-dessus
l’ancien APK sans désinstaller. Vérifier la conservation des données.

</details>

**Sauvegarde et export : pas encore disponibles.** Désinstaller l’application
ou effacer ses données supprime la base locale.

<sub>Expo SDK 57 · React Native · TypeScript · SQLite / Drizzle · NativeWind</sub>

## Licence

<a href="LICENSE"><img src="assets/readme/license.svg" alt="Licence MIT : code et design réutilisables, forks autorisés, y compris avec le même design." width="1200" /></a>

Voir la [licence MIT](LICENSE).
Les [polices, icônes et dépendances tierces](THIRD_PARTY_NOTICES.md) conservent leurs licences.
