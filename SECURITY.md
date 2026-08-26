# Politique de sécurité

## Périmètre

Le site public est statique. Le vérificateur, le diagnostic et le comparateur s'exécutent localement dans le navigateur. Aucun compte, SIREN, document de facturation ou résultat utilisateur ne doit être transmis à un serveur par le site public.

Les propriétés suivantes doivent rester vraies :

- aucune donnée saisie dans les formulaires ne quitte le navigateur ;
- le nom saisi dans le vérificateur est comparé à un index local et n'est jamais ajouté à l'URL ;
- les critères partageables du diagnostic utilisent uniquement le fragment d'URL, qui n'est pas envoyé au serveur ;
- aucune source distante n'est chargée à l'exécution ;
- les liens partagés ne contiennent ni SIREN, ni facture, ni secret ;
- les données publiques générées conservent leur provenance et passent la validation du schéma ;
- les valeurs inconnues ne sont pas traitées comme des preuves positives pour un critère impératif.

## Runner local du Lab

Le runner B2Brouter est un outil opérateur distinct du site public. Il accepte uniquement les trois fichiers synthétiques du Lab et une clé de sandbox dont le préfixe est `test_`.

Les propriétés suivantes doivent rester vraies :

- la clé et l'identifiant du compte viennent exclusivement de l'environnement local ;
- aucune clé ne figure dans un argument, un fichier suivi par Git, une URL, une sortie ou une erreur ;
- l'hôte est fixé à `https://api.b2brouter.net` et les redirections sont refusées ;
- la première campagne est limitée à une requête sur le seul cas Factur-X, sans nouvel essai automatique ;
- chaque import force `send_after_import=false` et aucune route d'envoi n'est implémentée ;
- le runner n'est importé par aucune page ou composant public.

## Signaler une vulnérabilité

Ne publiez pas de détail exploitable dans une issue publique. Utilisez la fonction privée « Report a vulnerability » de GitHub lorsque les avis de sécurité du dépôt seront activés. À défaut, contactez le mainteneur depuis son profil GitHub en indiquant l'impact, le chemin de reproduction minimal et la version concernée.

N'incluez aucune facture réelle, donnée personnelle, clé d'API ou identifiant de production dans le rapport.

## Versions prises en charge

Seule la dernière révision de la branche `main` est prise en charge pendant la bêta.
