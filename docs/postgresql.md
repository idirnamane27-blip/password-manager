# PostgreSQL local

Le serveur Node.js utilise PostgreSQL, via `pg`. React continue à communiquer uniquement avec l’API ; le mot de passe de la base n’est jamais envoyé au navigateur.

## Configuration

Le fichier `backend/.env`, ignoré par Git, contient :

```dotenv
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=sesame
PGUSER=sesame_app
PGPASSWORD="votre mot de passe PostgreSQL"
PORT=3001
APP_ORIGIN=http://127.0.0.1:5173
COOKIE_SECURE=false
```

Ne pas utiliser l’exemple de mot de passe ci-dessus tel quel ; renseigner celui choisi lors de la création de `sesame_app`.

Depuis la racine du projet, application arrêtée :

```bash
npm run db:setup
npm start
```

Le fichier `.env` est chargé automatiquement par le serveur et la commande de configuration. Les identifiants ne sont pas placés dans le code ou les arguments de commande.

## Tables

- `users` : identifiant UUID, nom, e-mail, hachage scrypt, sel, version des sessions et date de création. Index uniques sur le nom et l’e-mail, sans distinction de casse.
- `entries` : identifiant UUID, propriétaire, titre, identifiant de connexion, URL, catégorie, favori, composants du secret AES-GCM et dates. La clé étrangère `user_id` lie chaque entrée à son compte. `deleted_at` indique une entrée dans la corbeille.
- `app_migrations` : trace de l’import JSON, empreinte du fichier et nombres de comptes/entrées importés. Évite qu’un second lancement réimporte des données anciennes ou supprimées.

Le fichier `backend/src/database/schema.sql` définit ces tables. Les requêtes applicatives sont paramétrées. Chaque modification d’un compte et de ses entrées s’effectue dans une transaction, avec verrouillage du compte concerné.

## Migration des données existantes

La commande `npm run db:setup` refuse de migrer tant qu’un serveur écoute sur le port de l’API. Elle vérifie que les secrets existants sont déchiffrables, sauvegarde le JSON et la clé, puis importe les données atomiquement. Aucun fichier d’origine n’est supprimé ou remplacé. Les identifiants UUID sont conservés, car ils font partie du contexte de chiffrement des entrées.

Après migration, `backend/data/users.json` devient une ancienne copie : les nouvelles inscriptions et modifications vont dans PostgreSQL. Ne pas utiliser ce JSON comme sauvegarde des nouvelles données. Une migration déjà effectuée n’est pas rejouée. En cas de doublon ou d’erreur pendant l’import, les insertions sont annulées.

## Voir la base depuis psql

```bash
psql -h 127.0.0.1 -U sesame_app -d sesame -W
```

Dans psql :

```text
\dt
\d users
\d entries
```

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM entries;
SELECT title, category, favorite, deleted_at FROM entries;
```

Éviter de partager les résultats contenant des identifiants ou des données personnelles. `\q` quitte psql.

## Sauvegarder

```bash
pg_dump -h 127.0.0.1 -U sesame_app -d sesame -W -Fc -f sesame.backup
```

Conserver cette sauvegarde et `backend/data/vault.key` dans un emplacement protégé, hors du dépôt Git. La clé reste nécessaire même si la base est restaurée. Les mots de passe maîtres sont hachés ; les mots de passe des entrées sont chiffrés côté serveur. Les autres champs sont en clair.

## Vérifier

```bash
npm test
npm run test:postgres
npm run build
```

La deuxième commande utilise une instance PostgreSQL temporaire et des schémas de test séparés, puis les supprime. Elle ne se connecte pas à `sesame`. Par défaut, les binaires sont recherchés dans `/usr/lib/postgresql/16/bin` ; `PG_TEST_BIN` permet de changer ce chemin.

Références : [transactions node-postgres](https://node-postgres.com/features/transactions), [pool de connexions](https://node-postgres.com/features/pooling), [verrouillage PostgreSQL](https://www.postgresql.org/docs/16/sql-lock.html).
