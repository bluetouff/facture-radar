# Politique de sécurité

## Périmètre

Le site est statique. Le vérificateur, le diagnostic et le comparateur s'exécutent localement dans le navigateur. Aucun compte, SIREN, document de facturation ou résultat ne doit être transmis à un serveur par le code de ce dépôt.

Les propriétés suivantes doivent rester vraies :

- aucune donnée saisie dans les formulaires ne quitte le navigateur ;
- le nom saisi dans le vérificateur est comparé à un index local et n'est jamais ajouté à l'URL ;
- les critères partageables du diagnostic utilisent uniquement le fragment d'URL, qui n'est pas envoyé au serveur ;
- aucune source distante n'est chargée à l'exécution ;
- les liens partagés ne contiennent ni SIREN, ni facture, ni secret ;
- les données publiques générées conservent leur provenance et passent la validation du schéma ;
- les valeurs inconnues ne sont pas traitées comme des preuves positives pour un critère impératif.

## Signaler une vulnérabilité

Ne publiez pas de détail exploitable dans une issue publique. Utilisez la fonction privée « Report a vulnerability » de GitHub lorsque les avis de sécurité du dépôt seront activés. À défaut, contactez le mainteneur depuis son profil GitHub en indiquant l'impact, le chemin de reproduction minimal et la version concernée.

N'incluez aucune facture réelle, donnée personnelle, clé d'API ou identifiant de production dans le rapport.

## Versions prises en charge

Seule la dernière révision de la branche `main` est prise en charge pendant la bêta.
