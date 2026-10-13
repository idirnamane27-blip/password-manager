# Passage à PostgreSQL — 13 octobre 2026

## Validation

- `npm test` : 18 tests réussis (16 serveur et 2 générateur). Les six tests PostgreSQL sont réservés à la commande dédiée.
- `npm run test:postgres` : six tests réussis sur une instance PostgreSQL temporaire, sans connexion à la base de l’application.
- `npm run build` : compilation React réussie.

Les tests SQL couvrent l’inscription, les doublons, le coffre et l’isolation entre utilisateurs ; la relecture avec une nouvelle connexion à la base ; les favoris, la modification, la suppression, la restauration et la purge ; les contraintes uniques, les transactions annulées et les inscriptions concurrentes ; les paramètres du compte, les sessions et la suppression en cascade ; la sauvegarde et la migration JSON avec conservation du chiffrement ; le refus de réimporter une migration déjà appliquée et l’annulation en cas de conflit ou de clé manquante.

## Migration locale effectuée

`npm run db:setup` a été exécuté avec la configuration locale renseignée par l’utilisateur, application arrêtée.

- Base : `sesame`.
- Rôle applicatif : `sesame_app`.
- Tables créées : `users`, `entries`, `app_migrations`.
- Import réussi : 3 comptes et 3 entrées.
- Sauvegardes du JSON et de la clé : `backend/data/backups/`.
- Les fichiers d’origine et la clé ont été conservés.

La nouvelle version du serveur utilise PostgreSQL par défaut. Les variables de connexion sont chargées depuis `backend/.env`, exclu de Git. Les mots de passe de la base et les secrets des entrées n’ont pas été affichés dans les résultats de validation.
