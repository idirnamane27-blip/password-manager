import { mkdtemp, rm } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const binaryDirectory = process.env.PG_TEST_BIN || '/usr/lib/postgresql/16/bin';
const directory = await mkdtemp('/tmp/sesame-pg-test-');
const data = `${directory}/data`;
let started = false;
try {
  const socket = createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  await execute(`${binaryDirectory}/initdb`, ['-D', data, '-A', 'trust', '-U', 'sesame_test', '--no-locale', '--encoding=UTF8']);
  await execute(`${binaryDirectory}/pg_ctl`, ['-D', data, '-l', `${directory}/postgres.log`, '-o', `-h 127.0.0.1 -p ${port} -k ${directory}`, '-w', 'start']);
  started = true;
  console.log('PostgreSQL de test isolé démarré : aucune connexion à la base sesame.');
  const child = spawn(process.execPath, ['--test', fileURLToPath(new URL('../tests/postgres.test.js', import.meta.url))], {
    stdio: 'inherit', env: { ...process.env, SESAME_TEST_PG_PORT: String(port) }
  });
  process.exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => resolve(code ?? 1)); });
} catch (error) {
  console.error('Tests PostgreSQL impossibles :', error.code || error.message);
  console.error('Installer PostgreSQL 16 ou définir PG_TEST_BIN vers le dossier contenant initdb et pg_ctl.');
  process.exitCode = 1;
} finally {
  if (started) await execute(`${binaryDirectory}/pg_ctl`, ['-D', data, '-m', 'fast', '-w', 'stop']).catch(() => {});
  await rm(directory, { recursive: true, force: true });
}
