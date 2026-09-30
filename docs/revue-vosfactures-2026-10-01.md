# Alerte VosFactures du 1er octobre 2026

L’alerte est ajoutée au journal et à la fiche VosFactures. La première recherche du 1er octobre, limitée aux pages publiques de l’éditeur et à FrenchBreaches, était insuffisante. Les captures fournies par l’utilisateur ont permis de remonter au [signalement de Christophe Boutry](https://x.com/Ced_haurus/status/2105427903869571180), à [Fuites Infos](https://fuitesinfos.fr/article/2026-10-01-vosfactures) et à la notification reproduite.

## Sources et qualification

- [Notification Factuali / VosFactures, capture relayée par Fuites Infos](https://fuitesinfos.fr/uploads/2026/10/vosfactures-notification.webp), lue dans le navigateur : Factuali reconnaît un accès non autorisé aux données traitées chez son prestataire Fakturownia. Le texte concerne des comptes VosFactures, des clients et fournisseurs et une partie des documents. Factuali déclare épargnés les services de facturation électronique directement opérés dans son propre environnement et les données de cartes de paiement.
- [Communiqué officiel Fakturownia du 29 septembre](https://fakturownia.pl/incydent), lu directement sur le site : détection le 28 septembre, accès bloqué, rotations et nouvelles infrastructures annoncées, investigations encore en cours. Ses catégories de données et périodes de factures concernent son propre service ; elles ne sont pas extrapolées aux comptes français.
- [Article Fuites Infos du 1er octobre](https://fuitesinfos.fr/article/2026-10-01-vosfactures), consulté dans le navigateur : notification reproduite et courriel d’invalidation des codes API pour le 1er octobre. Les intégrations requièrent de nouveaux codes. L’annonce est distinguée d’un contrôle technique de son exécution.

La qualification `relayed_notice` décrit la provenance de la notification française : elle a été lue dans une reproduction par Fuites Infos. Il s’agit d’une reconnaissance de Factuali, distincte d’une revendication d’attaquant. Le communiqué primaire du prestataire corrobore l’incident dans son infrastructure.

## Attribution et dates

- `platformSlugs: ["vosfactures"]`, `kind: security`, `scope: upstream` : données du logiciel chez Fakturownia.
- `detectedAt: 2026-09-28` : détection chez le prestataire. Le 29 septembre est la date à laquelle Factuali indique avoir été informée.
- `firstReportedAt: 2026-10-01` : publication française retrouvée pour le périmètre VosFactures. La date d’affichage initial de la notification dans l’espace client reste inconnue.
- `startedAt: null` et `resolutionReportedAt: null` : durée d’accès et clôture à préciser ; statut `investigating`.
- Volume, détail des données françaises et extraction effective restent à préciser. Les déclarations relatives à l’environnement PA sont attribuées à Factuali. Aucun audit SecNumCloud ou chiffre de victimes n’est déduit de la notification.

La présence d’un flux automatique n’est pas une condition de publication. La collecte demeure quotidienne, avec 26 sources et sans appel à un modèle. Le corpus passe à 47 avis, dont cinq de sécurité et neuf portant explicitement sur les flux PA. Cette livraison comprend aussi les neuf avis ajoutés le 30 septembre et les corrections de dépendances déjà validées.
