# PA Check

PA Check est un vérificateur public de parcours de facturation électronique conçu pour les cabinets comptables. À partir du nom de l'outil déjà utilisé par un client, il indique si le parcours peut être conservé, doit être confirmé ou nécessite une action, sans collecte de facture, création de compte ni classement sponsorisé.

L'URL publique prévue est `https://pa.l0g.fr`. Le moteur, le corpus et les URLs de données restent indépendants de la marque.

## Ce qui constitue le produit

- un vérificateur en une question, avec une réponse copiable pour le client et les preuves en second niveau ;
- un diagnostic secondaire en trois questions, utilisé seulement lorsqu'il faut comparer des alternatives ;
- 15 dossiers enrichis, chacun relié à des sources publiques et datées ;
- une sélection explicite des acteurs selon leur portée documentée, la qualité des preuves publiques et la couverture des usages cabinets, TPE-PME et grands comptes ;
- l'annuaire officiel complet, soit 148 plateformes approuvées et 18 en attente dans le relevé DGFiP du 19 août 2026 ;
- un comparateur factuel sans note globale ;
- deux exports JSON publics pour permettre la vérification et la réutilisation ;
- une méthode, un schéma de données, des tests et un journal de changements publics.

La différence recherchée n'est pas le nombre de logos. Elle repose sur une réponse immédiatement utilisable, alimentée par la provenance champ par champ, des règles fail closed et la maintenance du corpus dans le temps.

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

Un critère impératif inconnu est bloquant. Un oui n'est utilisable que s'il porte le niveau `official` ou `documented` et au moins une source. `non_documented` ne signifie ni faux ni non conforme.

Les données enrichies vivent dans `src/data/platforms.ts`. Les sources sont dans `src/data/sources.json`. La méthode de sélection et les preuves de portée sont dans `src/data/corpus-selection.json`. L'import de l'annuaire DGFiP conserve l'URL, la date de publication et le SHA-256 du fichier source dans `src/data/official-directory.json`.

Le validateur vérifie notamment que les quinze fiches correspondent exactement à la sélection, que chaque preuve référence une source existante, que les dates d'immatriculation concordent avec la liste DGFiP et qu'aucune fonction réglementaire positive ne repose sur une déclaration faible ou une source absente.

## Limites

La bêta ne valide pas encore un fichier Factur-X, UBL ou CII. Elle ne constitue ni un conseil juridique ni une garantie de conformité individuelle. Les attributs non présents dans l'annuaire DGFiP ne sont jamais déduits pour les plateformes non enrichies.

## Signaler une correction

Ouvrez une issue en indiquant le champ contesté, l'entité et le périmètre concernés, la date d'effet et une URL publique ou une pièce publiable. Toute correction retenue doit apparaître dans le journal des changements.

## Sécurité

La politique de signalement est décrite dans [SECURITY.md](SECURITY.md). Ne publiez pas de vulnérabilité exploitable dans une issue publique.
