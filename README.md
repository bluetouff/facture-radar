# PA Check

PA Check est un service public d'aide au choix pour la facturation électronique. Il s'adresse aux indépendants, entrepreneurs, dirigeants, équipes administratives et comptables qui doivent vérifier leur outil actuel ou choisir une plateforme agréée.

L'URL publique est `https://pa.l0g.fr`. Le service fonctionne sans compte et sans classement sponsorisé. Le vérificateur de facture traite les fichiers localement dans le navigateur, sans téléversement ni conservation.

## Ce que propose le site

- 148 parcours détaillés, avec circuit, échéances, coût minimum connu, actions et sources consultables ;
- un prévol local des PDF Factur-X et XML CII, avec contrôles structurés et trois actions maximum ;
- un traitement distinct des offres sur devis, sans faux zéro ni projection lorsque le minimum public manque ;
- trois questions pour trouver jusqu'à trois plateformes adaptées à l'activité et à la priorité indiquées ;
- 148 fiches détaillées, chacune reliée à des sources publiques et datées ;
- une sélection explicite couvrant les indépendants, TPE, PME, cabinets comptables, ETI et grandes entreprises ;
- l'annuaire officiel complet, soit 148 plateformes approuvées et 18 en attente dans le relevé DGFiP du 19 août 2026 ;
- un comparateur point par point ;
- des exports JSON publics et un corpus consolidé pour permettre la vérification et la réutilisation ;
- un serveur MCP public en lecture seule, pour donner les mêmes réponses aux agents sans compte ni clé d'API ;
- une méthode, un schéma de données, des tests et un journal de changements publics.

PA Check vise une réponse immédiatement utile. Chaque information importante conserve sa source, sa date de mise à jour et un statut clair lorsque le détail reste à confirmer.

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
npm run mcp:build
npm run mcp:smoke
npm run data:refresh -- /chemin/liste-approuvees.xlsx /chemin/liste-attente.xlsx
```

`npm run build` valide les données, vérifie les composants Astro, exécute les tests, génère le site statique dans `dist/` puis construit le serveur MCP autonome dans `dist-mcp/`.

## Accès pour les agents

Le point d'entrée public est `https://pa.l0g.fr/api/mcp`, en Streamable HTTP. Le serveur publie cinq outils :

- `answer_question` pour partir d'une question en langage courant ;
- `get_platform` pour lire une fiche enrichie ;
- `find_platforms` pour appliquer les critères du diagnostic ;
- `search_official_directory` pour interroger tout le relevé DGFiP ;
- `get_corpus_status` pour contrôler la révision et les dates servies.

Sept ressources couvrent les questions, les fiches, l'annuaire officiel, les parcours d'activation, les options d'envoi d'un fichier existant et l'index des sources. Le même contenu reste accessible sans client MCP via `/api/corpus.json`, `/llms.txt` et `/llms-full.txt`.

Le serveur ne possède aucun outil d'écriture, n'appelle aucune URL fournie par le client et n'accepte aucun document. Il est lié à `127.0.0.1` derrière Apache. Les requêtes sont bornées et les critères sont validés par des schémas stricts.

Le rapport public `https://pa.l0g.fr/api/mcp/usage` agrège sur 91 jours les appels MCP, outils invoqués, jours actifs et histogrammes de latence. Il ne conserve ni IP, cookie, session, empreinte, chaîne user-agent, contenu de requête ou réponse. Les sondes internes sont exclues ; les séries quotidiennes, la date du dernier appel et les familles client sous `k=5` restent masquées. La récurrence porte sur les jours actifs, jamais sur des utilisateurs uniques.

Les conditions publiques sont disponibles sur les pages [Conditions d’utilisation](https://pa.l0g.fr/conditions-utilisation/), [Confidentialité](https://pa.l0g.fr/confidentialite/) et [Sécurité](https://pa.l0g.fr/securite/). Le contact de signalement responsable est également publié dans [`/.well-known/security.txt`](https://pa.l0g.fr/.well-known/security.txt).

## Statut des informations

Chaque champ enrichi porte un statut :

- `official` : DGFiP, AIFE ou texte applicable ;
- `documented` : tarif, contrat, documentation ou certificat public ;
- `declared` : affirmation de l'opérateur dont le périmètre ne peut pas être entièrement contrôlé ;
- `non_documented` : information publique à confirmer à la date de revue.

Un critère impératif inconnu est bloquant. Un oui n'est utilisable que s'il porte le niveau `official` ou `documented` et au moins une source. `non_documented` ne signifie ni faux ni non conforme.

Les données enrichies vivent dans `src/data/platforms.ts`. Les sources sont dans `src/data/sources.json`. La méthode de sélection et les indicateurs de portée sont dans `src/data/corpus-selection.json`. L'import de l'annuaire DGFiP conserve l'URL, la date de publication et le SHA-256 du fichier source dans `src/data/official-directory.json`.

Le validateur vérifie notamment que les 148 fiches correspondent exactement à la sélection, que chaque information référence une source existante, que les dates d'immatriculation concordent avec la liste DGFiP et qu'aucune fonction réglementaire positive ne repose sur une déclaration faible ou une source absente.

## Vérificateur Factur-X

Le composant `src/components/InvoiceVerifier.astro` lit le fichier uniquement côté navigateur. Les PDF sont inspectés avec PDF.js pour retrouver leur pièce jointe XML ; ils ne sont pas rendus. Le XML CII est contrôlé avec `saxes` puis analysé avec `fast-xml-parser`, sans entités, avec limites de taille et de profondeur. Le moteur pur et testable se trouve dans `src/lib/invoice-verifier.ts`.

Le résultat est un prévol technique. Il ne certifie pas la conformité juridique complète, l'authenticité, la signature, l'archivage, la transmission ou l'acceptation par une plateforme agréée.

## Limites

La bêta ne contrôle pas encore UBL. Elle ne constitue ni un conseil juridique ni une garantie de conformité individuelle. Les attributs non présents dans l'annuaire DGFiP ne sont jamais déduits pour les plateformes non enrichies.

## Signaler une correction

Ouvrez une issue en indiquant le champ contesté, l'entité et le périmètre concernés, la date d'effet et une URL publique ou une pièce publiable. Toute correction retenue doit apparaître dans le journal des changements.

## Sécurité

La politique de signalement est décrite dans [SECURITY.md](SECURITY.md). Ne publiez pas de vulnérabilité exploitable dans une issue publique.
