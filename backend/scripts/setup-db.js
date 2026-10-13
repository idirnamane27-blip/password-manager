import '../src/config/env.js';
import { createPostgresStore } from '../src/database/connection.js';
import { migrateJson } from '../src/database/migrate-json.js';
import { connect } from 'node:net';
async function apiIsRunning() {
  return new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port: Number(process.env.PORT || 3001) });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}
const store = createPostgresStore();
try {
  if (!process.env.PGPASSWORD) throw new Error('Renseignez PGPASSWORD dans backend/.env avec le mot de passe de sesame_app.');
  if (await apiIsRunning()) throw new Error('Arrêtez l’application avec Ctrl+C avant la migration, puis relancez cette commande.');
  await store.initialize();
  const info = await store.info();
  console.log(`Connexion PostgreSQL : ${info.database} (${info.role}). Tables créées ou déjà présentes.`);
  const result = await migrateJson(store);
  console.log(result.empty ? 'Aucune donnée JSON à importer.' : result.skipped ? 'Migration déjà effectuée : aucune donnée réimportée.' : `Migration réussie : ${result.users} compte(s), ${result.entries} entrée(s).`);
  if (result.backupDirectory) console.log('Sauvegarde locale : backend/data/backups/');
  const counts = await store.counts();
  console.log(`Base actuelle : ${counts.users} compte(s), ${counts.entries} entrée(s).`);
  console.log('Configuration terminée. Vous pouvez lancer npm start.');
} catch (error) {
  if (error.code === '28P01') console.error('Mot de passe PostgreSQL incorrect : vérifiez PGPASSWORD dans backend/.env.');
  else if (error.code === 'ECONNREFUSED') console.error('PostgreSQL est inaccessible. Vérifiez que le service est démarré.');
  else if (error.code === '3D000') console.error('La base sesame n’existe pas. Créez-la avant de relancer cette commande.');
  else console.error(error.status ? error.message : error.code ? `Configuration arrêtée (${error.code}). Aucune donnée existante n’a été écrasée.` : error.message);
  process.exitCode = 1;
} finally { await store.close(); }
