# Veille publique des incidents PA

Revue du 16 septembre 2026. Période étudiée : depuis le 1er septembre 2026, heure de Paris.

## Recherche initiale et publications

- Les **149 PA** ont fait l’objet de deux recherches nominatives : sécurité et sources de disponibilité. Les requêtes et URL trouvées sont archivées dans `docs/archives/incident-research-2026-09-16.json`. Ces résultats de recherche sont des pistes, pas des preuves de compromission. `src/data/incident-research.json` conserve la date et le périmètre par PA.
- **37 sources de disponibilité** ont été examinées, avec des limites propres à chaque source : flux glissant, historique vide, page dynamique, ancien portail désactivé. La recherche des 149 noms et la lecture d’un historique sont deux contrôles différents.
- **26 avis** sont publiés, dont **6 portant explicitement sur les flux PA** et **3 concernant le service connecté Welyb/eFacture ou Welyb/AGIRIS CONNECT**. Parmi ces trois ajouts, la notification de sécurité est relayée par FrenchBreaches et attend une confirmation directe de l’éditeur. Certains avis se recoupent. Aucun classement ou taux de disponibilité n’est calculé.
- `/incidents/` propose filtres, cinq avis par page, trois sources par page et dix plateformes par page dans la couverture. Sans JavaScript, tous les éléments restent affichés. Les liens directs révèlent l’avis ou la plateforme recherchée.
- `/incidents.xml` est le flux RSS commun des **avis relus et publiés**. Il conserve l’identifiant de chaque avis lors des mises à jour et affiche la date de modification de la source lorsqu’elle est publiée. Une date connue au jour près reste dans la description ; `pubDate` est omis pour éviter d’inventer une heure.
- Les fiches, `/api/incidents.json`, `/api/corpus.json`, `llms-full.txt`, la ressource MCP `pacheck://corpus/incidents` et `get_platform` utilisent le même corpus. La version 2.0 du corpus incidents expose le niveau de confirmation (`verification`), le service concerné (`affectedService`) et le lien documenté avec une PA (`relationship`). Les dates acceptent un horodatage, une date calendaire ou `null`. `detectedAt` distingue détection et début réel ; `checkedAt` reste la date de consultation. La résolution peut être annoncée avec une date inconnue. Les consommateurs doivent conserver ces incertitudes.

## Collecte légère

La fréquence demandée est **un relevé quotidien**, pas une surveillance à la minute. Le workflow `.github/workflows/incidents.yml` lance la collecte à 06 h 17 UTC. GitHub peut décaler l’exécution. Il n’y a aucune boucle de relance automatique.

Le registre `src/data/incident-watch-sources.json` contient **26 sources pour 25 PA, plus le CERT-FR** : RSS, Atom, trois API JSON et la page TrustEsker. Une exécution effectue au plus 26 lectures de contenu, avec quatre sources simultanées. La résolution DNS publique épinglée génère ses propres échanges réseau. Les sources d’un même opérateur ne sont pas interrogées deux fois pour les variantes RSS et Atom.

```sh
npm run incidents:collect
```

Le workflow restaure l’état précédent, collecte et archive :

- `incident-watch-state` : observations, empreintes, file de revue persistante et dernier bilan ;
- `incident-watch-evidence` : réponses originales avec SHA-256, modifications du jour et file de revue.

Les artifacts sont conservés 30 jours ; l’état cumulatif est reporté d’une exécution à la suivante. Une indisponibilité prolongée au-delà de cette rétention demande une récupération manuelle. Une erreur de restauration arrête le travail au lieu de repartir silencieusement de zéro. La collecte reste sans droit d’écriture sur le dépôt ou le site.

Localement, les fichiers sont dans `tmp/incident-watch/`, exclu de Git. Un verrou empêche deux collectes concurrentes. Après un arrêt brutal, vérifier l’absence d’un collecteur encore actif avant de retirer `.collect-lock`.

Chaque source utilise TLS vérifié, une adresse DNS publique épinglée, une URL autorisée, un délai de 20 secondes et une limite de 2 Mio. Les redirections sont refusées. Saxes contrôle le XML ; DTD et entités externes sont refusées. Liens, origines, formats et dates sont contrôlés avant la mise en file. Les contenus externes sont des données non fiables, jamais du code ou des instructions à exécuter.

Le collecteur compare les empreintes et conserve les avis sortis des flux glissants. Better Stack publie plusieurs entrées pour un même avis : la dernière version est retenue indépendamment de l’ordre. Un retrait de message TrustEsker déclenche une revue, jamais une résolution automatique. Une liste vide dans une API dont le schéma ou la fenêtre est invalide produit un échec.

Les nouveaux éléments restent dans la file de revue même après un relevé sans changement. La conservation des données précède la publication : **la collecte est automatique, la qualification et la mise en production suivent la revue**. Le flux CERT-FR fournit des pistes de vulnérabilités ; ses avis ne deviennent pas automatiquement des incidents de PA.

## Revue utile, sans travail répété

Le réveil automatique Codex est **en pause** pour éviter la consommation automatique de tokens. Le workflow GitHub est un script déterministe, sans appel à un modèle. À la demande de l’utilisateur, lire d’abord les artifacts existants et examiner les changements utiles. Une recherche web supplémentaire répond à un signal concret ; la recherche générale des 149 PA n’est pas répétée chaque jour.

1. Lire la source originale et identifier l’entreprise, le produit, les pays et les services effectivement concernés.
2. Recontrôler les avis ouverts : Esker environnement G, Spendesk virements et Tungsten assistance au 16 septembre. La disparition d’une entrée du flux n’est pas une preuve de résolution.
3. Vérifier les dates : début réel nullable, premier signalement, publication de résolution, dernière mise à jour et date de notre contrôle. Un intervalle entre notifications n’est pas une durée de panne.
4. Distinguer facturation électronique (`pa`), application (`publisher_service`) dépendance (`upstream`) et service connecté (`connected_service`). Une notification de vulnérabilité, de phishing ou une revendication demande une qualification distincte d’un incident confirmé.
5. Ajouter les faits relus aux sources et au corpus, conserver les incertitudes et mettre à jour les contrôles de livraison. Exécuter `npm run build` et `npm run mcp:smoke`, puis vérifier les surfaces modifiées.
6. Signaler seulement une information utile : nouvel incident confirmé, évolution importante, résolution ou nouveau défaut de veille nécessitant une action. Un défaut inchangé ne produit pas une nouvelle alerte quotidienne. Les notifications relayées suffisamment documentées sont publiées avec leur attribution et leur niveau de confirmation, même sans flux automatique.

Les notifications privées, espaces clients et données de facturation restent hors du périmètre. Aucune disponibilité ou garantie de sécurité ne découle d’un flux vide.

## Résultats et pistes au 16 septembre

- Douze avis supplémentaires relus : WeInvoice (2), Spendesk (4), Dokapi (1), Invopop (2), MyUnisoft (2), Tungsten (1). Les perturbations d’application et de support conservent leur périmètre.
- SAP : le bulletin primaire CERTFR-2026-AVI-1134 du 8 septembre décrit des vulnérabilités. Il est présenté séparément des incidents.
- blgCloud : la notification primaire du 10 août décrit une attaque de juillet. Les articles de septembre concernant un client restent à recouper ; ils ne déplacent pas l’attaque en septembre.
- Welyb / AGIRIS CONNECT : notification de fuite détectée le 1er septembre, relayée par [FrenchBreaches le 15 septembre](https://frenchbreaches.com/alertes/welyb-agiris-mu2m3x9bh33cfsst2bl), désormais publiée. Confirmation directe de l’éditeur à obtenir. Elle figure dans la fiche Cecurity au titre du [service connecté documenté par Welyb](https://support.welyb.fr/connecter-welyb-avec-la-pa-efacture-cecurity). L’impact sur la PA et les factures reste non établi.
- Deux avis de disponibilité [publiés par Welyb](https://support.welyb.fr/statut-plateforme) sont ajoutés : raccordement de nouveaux dossiers eFacture perturbé le 14 septembre ; consultation des factures XML rétablie après une difficulté depuis le 4 septembre. Pour ce second avis, la publication et la résolution sont non datées ; la consultation du 16 septembre est conservée séparément. L’ancien avis de connexion clos, parmi les entrées de juillet, ne clôt pas celui du 14 septembre.
- La règle antérieure écartait le signalement Welyb du journal tout en le conservant dans les notes. Cette omission éditoriale est corrigée : un flux automatique est un moyen de collecte, jamais une condition de publication. Les recherches et publications manuelles complètent les flux. Le nombre de sources automatiques reste 26 et la fréquence quotidienne reste inchangée.
- Accent Rouge / Odoo : article du 5 septembre sur une instance cliente. Notification primaire et périmètre d’hébergement à confirmer ; aucune compromission de l’opérateur PA déduite.
- Faux rapprochements exclus : Intesa Sanpaolo / In.Te.S.A., Sage Publishing / Sage, Compleo Charging / Symtrax, OneUp Sales / OneUp, ESI Group / ESI-GROUPE.
- Avis anciens exclus de la période : notamment Avalara et Esker (2025), Cegid et Cegedim (février 2026), Axonaut et Accenture (juin/juillet 2026).
- Anciens flux Pagero et Sovos : redirection vers `inactive.rss`. Le flux racine Tungsten renvoie 404 ; le flux Europe, explicitement lié depuis la page régionale, est utilisé et vérifié à sa place.
- Pages dynamiques DocuWare et Iopole : historique incomplet dans l’extraction. Odoo : extraction mêlant événements anciens et exemples. Aucun avis de septembre inventé à partir de ces pages.

## Rédaction

Présenter le fait observé, le service concerné et l’information à obtenir. Éviter les séries de négations, les slogans en phrases miroirs et les constructions répétées « ce qui… », « ce que… ». Les réserves portent sur une source précise, pas sur une déclaration générique répétée partout.
