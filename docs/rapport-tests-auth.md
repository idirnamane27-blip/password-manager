# Vérification de l’authentification — 5 octobre 2026

Ce rapport décrit la première version. Pour les fonctionnalités ajoutées ensuite, consulter `rapport-tests-coffre.md`.

## Vérifications automatisées

`npm test` : 7 tests réussis.

- Inscription, session, déconnexion, reconnexion et lecture des comptes persistés.
- Validation côté serveur : nom, e-mail, longueur, confirmation, type et taille des requêtes.
- Refus des doublons, y compris deux inscriptions concurrentes.
- Erreur identique pour un compte inconnu ou un mauvais mot de passe ; aucun cookie de session créé.
- Expiration de session et configuration du cookie Secure.
- Refus des requêtes provenant d’un site tiers.
- Limitation des tentatives et reprise après le délai.

`npm run build` : compilation React réussie.

## Parcours dans Chromium

Un compte temporaire et un stockage séparé ont été utilisés, sans créer de compte dans les données de l’application.

- Affichage du formulaire d’inscription.
- Erreur lorsque les confirmations diffèrent.
- Affichage et masquage du mot de passe.
- Inscription et ouverture automatique de session.
- Cookie HttpOnly et SameSite=Strict.
- Conservation de la session après rechargement.
- Déconnexion et retour au formulaire de connexion.
- Message d’erreur pour un mauvais mot de passe.
- Connexion réussie avec les bons identifiants.
- Navigation vers l’inscription.
- Rendu mobile à 375 px sans débordement horizontal.
- Aucune erreur JavaScript détectée pendant le parcours.

Les captures des deux formulaires et du rendu mobile se trouvent dans `apercus/`.

## Limites

Ces vérifications couvrent cette version locale du TP. Elles ne constituent pas un audit de sécurité ni une validation de déploiement en production. Les autres fonctionnalités ne sont pas encore implémentées.
