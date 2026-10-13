# Vérification de la version complète — 13 octobre 2026

## Résultats

- `npm test` : 18 tests réussis (16 serveur, 2 générateur), aucun échec.
- `npm run build` : compilation React réussie.
- Parcours complet dans Chromium : réussi, sans erreur JavaScript.
- Vérification du rendu des sept nouvelles pages à 375 px : aucun débordement horizontal.

Les vérifications utilisent des comptes fictifs et un stockage temporaire séparé. Les comptes et entrées existants de l’application n’ont pas été utilisés ou modifiés pour les tests.

## Couverture du serveur

L’authentification existante est toujours testée : inscription, validation, doublons, connexion, cookies, déconnexion, expiration, origine et limitation des tentatives.

Les nouveaux tests vérifient :

- Création, lecture et modification des entrées ; absence de mots de passe en clair dans le stockage ou les réponses de liste.
- Relecture avec une nouvelle instance du service de chiffrement et la clé persistée.
- Isolation entre utilisateurs pour la liste, le secret, la modification, les favoris, la suppression et la restauration.
- Favoris ; suppression vers la corbeille ; restauration ; effacement définitif ; vidage qui conserve les entrées actives.
- Conservation avant 30 jours et purge à l’échéance, avec refus de restauration après expiration.
- Validation des champs et URL ; refus des mutations provenant d’un autre site.
- Modification du profil et du mot de passe maître ; fermeture des anciennes sessions et conservation des mots de passe du coffre.
- Refus d’une version de session obsolète, y compris pour une connexion concurrente à une modification du compte.
- Suppression du compte avec ses données, sans supprimer les autres comptes.
- Refus d’un secret altéré, d’un contexte de propriétaire incorrect ou d’une clé manquante.

Les tests du générateur vérifient les longueurs, les groupes de caractères sélectionnés, les bornes et le renouvellement des résultats.

## Parcours dans le navigateur

Inscription → coffre vide → ajout de trois entrées → recherche et catégories → copie dans le presse-papiers → ajout aux favoris et tri → modification avec affichage et génération → rechargement et conservation des données → annulation d’une suppression → suppression confirmée → restauration → suppression et effacement définitif → réglages du générateur → modification du profil avec un mot de passe incorrect puis correct → changement du mot de passe maître → déconnexion et reconnexion avec les nouveaux identifiants → vérification mobile → suppression confirmée du compte.

Les captures des nouvelles pages se trouvent dans `apercus/`. Le vidage de corbeille et l’expiration à 30 jours sont vérifiés par les tests serveur.

## Limites de cette validation

Il s’agit d’une application locale de TP utilisant un seul processus serveur et un fichier JSON. Le chiffrement des mots de passe des entrées repose sur une clé détenue par le serveur ; les métadonnées ne sont pas chiffrées. Ces tests ne constituent pas un audit de sécurité ni une validation de déploiement public. Les règles du générateur et de la corbeille restent à valider avec le PO.
