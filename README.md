# Facture Radar

Facture Radar est un vérificateur public de parcours de facturation électronique. Il confronte les contraintes d'une entreprise aux preuves disponibles sur les plateformes agréées, sans collecte de facture, création de compte ni classement sponsorisé.

Le nom est provisoire. Le moteur, le corpus et les URLs de données n'en dépendent pas.

## Ce qui constitue le produit

- un diagnostic explicable qui refuse de convertir une information inconnue en compatibilité supposée ;
- 12 dossiers enrichis, chacun relié à des sources publiques et datées ;
- l'annuaire officiel complet, soit 148 plateformes approuvées et 18 en attente dans le relevé DGFiP du 19 août 2026 ;
- un comparateur factuel sans note globale ;
- deux exports JSON publics pour permettre la vérification et la réutilisation ;
- une méthode, un schéma de données, des tests et un journal de changements publics.

La différence recherchée n'est pas le nombre de logos. Elle repose sur la provenance champ par champ, les règles d'exclusion reproductibles, les inconnues visibles et la maintenance du corpus dans le temps.

## Lancer le projet

Prérequis : Node.js 22 ou plus récent.

```bash
npm ci
npm run build
npm run preview
```

Commandes utiles :

```bash
npm run check
npm test
npm run data:refresh -- /chemin/liste-approuvees.xlsx /chemin/liste-attente.xlsx
```

`npm run build` valide les données, vérifie les composants Astro, exécute les tests du moteur puis génère le site statique dans `dist/`.

## Modèle de preuve

Chaque champ enrichi porte un statut :

- `official` : DGFiP, AIFE ou texte applicable ;
- `documented` : tarif, contrat, documentation ou certificat public ;
- `declared` : affirmation de l'opérateur dont le périmètre ne peut pas être entièrement contrôlé ;
- `non_documented` : preuve publique insuffisante à la date de revue.

Un critère impératif inconnu est bloquant. `non_documented` ne signifie ni faux ni non conforme.

Les données enrichies vivent dans `src/data/platforms.ts`. Les sources sont dans `src/data/sources.json`. L'import de l'annuaire DGFiP conserve l'URL, la date de publication et le SHA-256 du fichier source dans `src/data/official-directory.json`.

## Limites

La bêta ne valide pas encore un fichier Factur-X, UBL ou CII. Elle ne constitue ni un conseil juridique ni une garantie de conformité individuelle. Les attributs non présents dans l'annuaire DGFiP ne sont jamais déduits pour les plateformes non enrichies.

## Signaler une correction

Ouvrez une issue en indiquant le champ contesté, l'entité et le périmètre concernés, la date d'effet et une URL publique ou une pièce publiable. Toute correction retenue doit apparaître dans le journal des changements.

## Sécurité

La politique de signalement est décrite dans [SECURITY.md](SECURITY.md). Ne publiez pas de vulnérabilité exploitable dans une issue publique.
