# Sésame

Gestionnaire de mots de passe — Projet Processus du développement logiciel.

## Fonctionnalités implémentées

Cette version comprend les neuf écrans React proposés, reliés à une API Node.js : inscription, connexion, coffre, favoris, ajout, modification, générateur, corbeille et paramètres. Après authentification, l’utilisateur arrive dans son coffre personnel. Les données d’exemple des maquettes ne sont pas ajoutées automatiquement : le coffre d’un nouveau compte est vide.

- Coffre : recherche par titre, identifiant ou URL ; filtres Travail, Perso et Banque ; copie du mot de passe sans l’afficher.
- Entrées : titre, identifiant, mot de passe, URL facultative et catégorie ; création et modification avec affichage/masquage et génération intégrée.
- Favoris : ajout/retrait avec l’étoile, recherche, tri par nom, date d’ajout ou dernière modification.
- Générateur : préréglages Faible (8 lettres minuscules), Fort (12 caractères avec majuscules et chiffres), Très fort (16 caractères avec symboles) ; longueur de 6 à 64 caractères et groupes configurables. Génération locale via Web Crypto, avec au moins un caractère de chaque groupe sélectionné. Le niveau affiché décrit le résultat obtenu, pas uniquement le préréglage choisi.
- Corbeille : confirmation avant suppression, restauration, effacement définitif individuel ou vidage confirmé. Rétention de 30 jours ; purge aux accès au coffre, au démarrage et toutes les heures pendant le fonctionnement du serveur.
- Paramètres : modification du nom/e-mail, changement du mot de passe maître, déconnexion et suppression définitive du compte avec ses entrées. Les modifications sensibles demandent le mot de passe maître actuel. La suppression demande également de saisir SUPPRIMER.

L’inscription et la connexion ont été développées en premier pour le Sprint 1. Les nouvelles fonctionnalités sont à intégrer dans votre backlog et à faire valider par le PO ; ce README décrit le code réalisé et ne remplace pas les décisions de sprint de l’équipe.

## Démarrer

Prérequis : Node.js, npm et PostgreSQL local. La version actuelle fonctionne avec Node.js 18.19 ou supérieur ; privilégier une version LTS maintenue pour la suite. Vite 6 est utilisé pour être compatible avec le Node.js présent sur la machine.

Depuis le dossier `password-manager` :

```bash
npm install
npm run db:setup
npm start
```

`npm start` démarre le serveur et l’interface, puis ouvre le navigateur par défaut sur **http://127.0.0.1:5173**. Le serveur écoute sur le port **3001**. Garder le terminal ouvert ; `Ctrl+C` arrête les deux services. `npm run dev` démarre les mêmes services sans ouvrir le navigateur.

Avant la première configuration, créer la base PostgreSQL `sesame`, appartenant au rôle `sesame_app`, puis copier `backend/.env.example` vers `backend/.env` et renseigner `PGPASSWORD` localement. Le serveur charge automatiquement ce fichier. Ne pas partager son contenu. Si le mot de passe contient `#` ou des espaces, entourer sa valeur de guillemets dans `.env`.

`npm run db:setup` crée les tables et importe les anciens comptes/entrées JSON dans une transaction. Arrêter l’application avant cette commande. Une sauvegarde du JSON et de la clé est conservée dans `backend/data/backups/`. La migration garde les identifiants, hachages et secrets chiffrés ; elle n’est appliquée qu’une seule fois. En cas de conflit avec un compte existant, l’import est annulé sans écraser de données. Les nouveaux enregistrements utilisent PostgreSQL uniquement. Le détail se trouve dans [docs/postgresql.md](docs/postgresql.md).

Créer un compte avec un nom d’utilisateur (3 à 30 lettres, chiffres, points, tirets ou underscores), une adresse e-mail et un mot de passe maître de 12 à 128 caractères. La confirmation doit correspondre. L’inscription ouvre automatiquement une session. Après déconnexion, se reconnecter avec le nom d’utilisateur et le mot de passe.

L’indicateur de force est une aide indicative : faible par défaut, fort à partir de 12 caractères et deux types de caractères, très fort à partir de 16 caractères et trois types. Ces règles sont une proposition à valider avec le PO.

## Vérifier

```bash
npm test
npm run test:postgres
npm run build
```

`npm test` vérifie les contrôleurs avec le stockage JSON de test et le générateur. `npm run test:postgres` démarre une instance PostgreSQL temporaire, puis vérifie le stockage SQL et la migration avec des comptes fictifs. Aucune de ces commandes ne modifie la base `sesame`. Les tests PostgreSQL nécessitent les exécutables PostgreSQL 16 ; définir `PG_TEST_BIN` vers leur dossier pour une autre installation.

## Organisation

- `frontend/` : interface React, logo SVG, formulaires, styles et appels API.
- `backend/` : serveur HTTP Node.js, validation, hachage des mots de passe et sessions.
- `backend/src/database/schema.sql` : tables `users`, `entries` et suivi de la migration.
- `backend/src/database/connection.js` : accès PostgreSQL via le pilote `pg`, requêtes paramétrées et transactions.
- `backend/src/database/json-store.js` : ancien stockage, conservé pour les tests et la migration uniquement.
- `backend/data/users.json` : ancien fichier JSON conservé après migration, ignoré par Git ; il n’est plus actualisé par l’application.
- `backend/data/vault.key` : clé de chiffrement générée à la première entrée, ignorée par Git.
- `docs/` : documents Scrum réservés au suivi du projet.

Les mots de passe maîtres sont hachés avec scrypt et un sel aléatoire. Ils ne sont pas enregistrés en clair. Les sessions utilisent des jetons aléatoires dans un cookie HttpOnly et SameSite=Strict ; elles expirent après huit heures. Les sessions sont en mémoire : un redémarrage du serveur demande une nouvelle connexion, mais conserve les comptes et leurs entrées. Une limite de 20 tentatives d’authentification et d’actions sensibles sur le compte par adresse IP sur 15 minutes est appliquée, inscriptions incluses. Les changements de profil ou de mot de passe ferment les autres sessions ; la session courante est renouvelée.

Les mots de passe des entrées sont chiffrés avec AES-256-GCM, un IV aléatoire et une authentification liée au propriétaire et à l’entrée. Les listes ne transmettent pas les secrets au navigateur ; le mot de passe est demandé séparément pour copier ou modifier une entrée. Les autres champs (titre, identifiant, URL, catégorie, dates) sont enregistrés en clair. Le chiffrement est effectué côté serveur avec une clé locale : il ne s’agit pas d’un coffre à connaissance nulle ni d’une clé dérivée du mot de passe maître.

Sauvegarder la base PostgreSQL avec `pg_dump` et conserver également `backend/data/vault.key` dans un emplacement protégé. Ne pas supprimer ou remplacer la clé : sans elle, les mots de passe des entrées ne sont plus lisibles. Si la clé manque alors que des entrées existent, le serveur refuse de créer une clé de remplacement. L’ancien JSON, la clé et `.env` sont exclus de Git ; ne pas les partager avec le dépôt.

Le stockage courant est PostgreSQL. Les index uniques empêchent les doublons de comptes, les entrées sont liées à leur propriétaire par une clé étrangère et la suppression de compte efface ses entrées en cascade. Les mutations verrouillent les données du compte pendant leur transaction pour éviter les pertes lors d’actions concurrentes. Les sessions restent en mémoire du serveur ; cette version est prévue pour une instance locale. La vérification e-mail et la récupération du compte ne sont pas implémentées. Utiliser des comptes et mots de passe fictifs pour le TP.

Références techniques : [chiffrement dans Node.js](https://nodejs.org/api/crypto.html) et [génération aléatoire dans le navigateur](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

Le fichier `backend/.env.example` documente la configuration PostgreSQL et les variables du serveur. `backend/.env` est chargé automatiquement ; les variables déjà définies dans le terminal ont priorité. Pour un hébergement futur, prévoir HTTPS, `COOKIE_SECURE=true`, l’origine autorisée et un proxy adapté. `npm run build` compile l’interface, sans déployer l’application.
