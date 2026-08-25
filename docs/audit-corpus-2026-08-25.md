# Audit du corpus initial des plateformes agréées

Date de revue : 25 août 2026  
Audience : responsables produit, cabinets d'expertise comptable et mainteneurs du corpus

## Executive Summary

Le corpus retient quinze acteurs approuvés par la DGFiP, choisis pour leur portée publiée ou une documentation publique distinctive, ainsi que pour leur utilité pour les cabinets. Six couvrent directement les écosystèmes cabinets et ERP, quatre les TPE-PME et cinq les ETI et grands comptes.

Treize fiches disposent d'une preuve publique exploitable pour la réception, l'émission et l'e-reporting. MyUnisoft reste volontairement à confirmer sur l'e-reporting, car la source produit retenue documente l'émission et la réception sans expliciter cette fonction. Qonto reste également à confirmer : sa page commerciale annonce l'e-reporting, mais son aide officielle indique au 25 août 2026 un accès bêta limité à certaines organisations éligibles. Ces inconnues bloquent le feu vert.

Deux défauts de décision ont été corrigés. Le moteur refusait déjà les valeurs nulles, mais acceptait encore une valeur vraie déclarative ou privée de source. Il pouvait aussi faire hériter un produit Cegid, Sage ou SAP du statut de la PA sans confirmer l'édition et l'activation. Les deux cas retournent désormais « à confirmer ».

## Sélection et niveau de preuve

| Acteur | Segment de sélection | Portée utilisée pour sélectionner | Réception | Émission | E-reporting | Principale limite publique |
| --- | --- | --- | --- | --- | --- | --- |
| Cegid | Cabinet et ERP | 750 000 clients dans 130 pays selon Cegid | Documenté | Documenté | Documenté | Édition, API, tarifs et réversibilité à confirmer |
| Sage | Cabinet et ERP | Plus de deux millions de clients annoncés | Documenté | Documenté | Documenté | Activation et périmètre variables selon le produit |
| Pennylane | Cabinet et ERP | Un million d'entreprises annoncé sur la page produit | Documenté | Documenté | Documenté | Hébergement, certificat et coût de sortie incomplets |
| Tiime | Cabinet et ERP | Plus de 350 000 utilisateurs annoncés | Documenté | Documenté | Documenté | Certificat à archiver et transferts hors UE à préciser |
| Abby | TPE-PME | Plus de 100 000 indépendants annoncés | Documenté | Documenté | Documenté | Accès cabinet, API PA, hébergement et réversibilité |
| MyUnisoft | Cabinet et ERP | 1 300 cabinets et 255 000 dossiers annoncés | Documenté | Documenté | Non documenté | E-reporting, tarifs, formats et réversibilité |
| Septeo Ingeneo | Cabinet et ERP | Plus de 1 200 cabinets et 100 000 sociétés annoncés | Documenté | Documenté | Documenté | Plafonds, certificat et contrat de réversibilité à contrôler |
| Qonto | TPE-PME | Plus de 600 000 entreprises clientes annoncées en Europe | Documenté | Documenté | Non documenté | E-reporting encore limité à une bêta éligible, API gratuite, export et hébergement de la PA |
| Indy | TPE-PME | Plus de 100 000 utilisateurs annoncés dès juillet 2024 | Documenté | Documenté | Documenté | Export, hébergement et accès cabinet tiers |
| Sellsy | TPE-PME | Plus de 50 000 utilisateurs, 2 800 experts-comptables et 22 000 entreprises annoncés | Documenté | Documenté | Documenté | Volumes, activation par licence, certificat et sortie |
| SuperPDP | ETI et grands comptes | Portée client non publiée; compte et API documentés jusqu'aux fortes volumétries | Documenté | Documenté | Documenté | Accès cabinet, engagement, certificat et sortie |
| SAP | ETI et grands comptes | Plus de 320 000 entreprises clientes annoncées | Documenté | Documenté | Documenté | Activation, tarifs et hébergement propres au projet |
| Generix | ETI et grands comptes | 400 000 entreprises et 500 millions de factures annuelles annoncées | Documenté | Documenté | Documenté | Paliers, réversibilité et hébergement de la PA |
| Esker | ETI et grands comptes | Plus de 1 700 clients documentés dans le rapport annuel 2023 | Documenté | Documenté | Documenté | Tarifs, réversibilité et accès cabinet tiers |
| Cegedim SY business | ETI et grands comptes | Plus d'un milliard de flux annuels et deux millions d'entreprises connectées annoncés | Documenté | Documenté | Documenté | Tarifs, formats, réversibilité et hébergement de la PA |

La colonne « portée » ne constitue pas une part de marché. Les unités, périmètres et dates diffèrent. Ces chiffres servent uniquement à sélectionner un premier terrain d'étude pertinent.

## Key findings with evidence

### 1. Critique, corrigé : un oui trop faible pouvait produire du vert

Le vérificateur et le diagnostic utilisent maintenant une valeur seulement si elle est `official` ou `documented` et possède au moins une source. Une valeur `declared`, même vraie, reste une inconnue. Les tests couvrent les deux cas de régression : statut déclaratif et liste de sources vide.

### 2. Élevé, corrigé : une gamme logicielle pouvait hériter du statut de la PA

Les saisies génériques Cegid, Sage, SAP, EBP et Teogest retournent une confirmation d'édition et d'activation. Un feu vert direct n'est possible que pour le service PA explicitement nommé ou pour un parcours intégré dont les quatre preuves sont rattachées à la fiche.

### 3. Moyen, corrigé : le corpus sous-pondérait les parcours indépendants, TPE-PME et API

Abby, Sellsy et SuperPDP rejoignent le corpus. Les deux premiers renforcent les parcours indépendants, TPE-PME et cabinets. SuperPDP apporte une documentation publique détaillée du compte, de l'API, des formats et de l'e-reporting. Axonaut, Dougs, macompta.fr et Shine restent hors du corpus; leur absence ne produit jamais un verdict de non-conformité.

### 4. Moyen, résiduel : sécurité, hébergement et sortie restent peu comparables

Les pages publiques documentent mieux les fonctions réglementaires que l'hébergement exact de la PA, le périmètre des certificats, les sous-traitants, la réversibilité et les coûts de sortie. Ces champs restent visibles comme inconnus. Ils ne sont pas transformés en notes ou en hypothèses.

## Next steps

1. Archiver les certificats et contrats publics avec date, empreinte et périmètre d'entité.
2. Obtenir une preuve publique explicite de l'e-reporting opérationnel MyUnisoft avant tout feu vert.
3. Ajouter une fiche « édition et activation » aux principaux logiciels Cegid, Sage et SAP.
4. Construire une suite de cas cabinets à partir de contrats anonymisés, sans importer de facture ni de donnée client.
5. Mettre à jour le corpus à chaque nouvelle liste DGFiP et journaliser toute substitution d'acteur.

## Further questions

- Quel document contractuel prouve la réversibilité et le délai de restitution pour chaque acteur ?
- Quelle édition exacte donne accès à la PA, à quel prix et avec quel mandat d'activation ?
- Le certificat de sécurité couvre-t-il l'entité juridique, le service PA et l'infrastructure effectivement utilisés en France ?
- Quels acteurs publient une matrice complète Factur-X, UBL, CII, statuts de cycle de vie et cas de rejet ?

## Caveats and assumptions

- Le statut PA et les dates proviennent du relevé DGFiP du 19 août 2026.
- Les chiffres de portée sont publiés par les acteurs ou dans leurs rapports. Ils ne sont ni harmonisés ni audités comme parts de marché.
- « Documenté » signifie qu'une pièce publique a été reliée au champ. Cela ne remplace pas un test technique, un audit de sécurité ou la vérification du contrat du client.
- Le corpus évalue un parcours public à une date donnée. Il ne garantit pas que le service soit activé chez un client.
- Le seul graphique compte les preuves fortes sur trois fonctions réglementaires. Ce compteur n'est ni une note qualité, ni un score de sécurité, ni un classement commercial.

## Registre primaire condensé

- [Liste officielle des plateformes agréées, DGFiP](https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees)
- [Plateforme Agréée Cegid](https://www.cegid.com/fr/facture-electronique-obligatoire/pdp/) et [portée publiée par Cegid](https://www.cegid.com/fr/a-propos/)
- [Plateforme Agréée Sage](https://www.sage.com/fr-fr/dematerialisation/facture-electronique/sage-plateforme-de-dematerialisation-partenaire/)
- [Facturation électronique Pennylane](https://www.pennylane.com/fr/logiciel-facturation-electronique)
- [Plateforme Agréée Tiime](https://www.tiime.fr/plateforme-dematerialisation-partenaire-pdp)
- [Facturation électronique gratuite Abby](https://aide.abby.fr/fr/articles/15276234-la-facturation-electronique-est-elle-gratuite-sur-abby)
- [MyUnisoft](https://myu.fr/)
- [Plateforme Agréée Septeo Ingeneo](https://www.ingeneo.septeo.com/plateforme-agreee-facturation-electronique)
- [Facturation électronique Qonto](https://qonto.com/fr/invoicing/e-invoicing)
- [Facturation électronique Indy](https://www.indy.fr/facturation-electronique/)
- [Sellsy pour les experts-comptables](https://go.sellsy.com/sellsy-experts-comptables)
- [Fonctionnalités SuperPDP](https://www.superpdp.tech/fonctionnalites/) et [tarifs SuperPDP](https://www.superpdp.tech/tarifs/)
- [Validation PA de SAP France](https://news.sap.com/france/2026/02/facturation-electronique-2026-sap-franchit-une-etape-decisive-et-obtient-la-validation-en-tant-que-plateforme-agreee-pa/)
- [Plateforme Agréée Generix](https://www.generixgroup.com/fr/edi-services-facturation-electronique/pdp-dematerialisation-factures)
- [Architecture de facturation électronique Esker](https://cloud.esker.fr/fm/others/support-presentation-webconference-b2b-2024-esker-fidal-june-06042023.pdf)
- [Immatriculation PA de Cegedim Business Services](https://www.cegedim.fr/Communique/CegedimBusinessServices_Plateforme-Agreee_16122025.pdf)
