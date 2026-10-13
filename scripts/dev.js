import { spawn } from 'node:child_process';
const children = ['backend', 'frontend'].map(workspace => {
  const args = ['run', 'dev', '--workspace', workspace];
  if (workspace === 'frontend' && process.argv.includes('--open')) args.push('--', '--open');
  return spawn('npm', args, { stdio: 'inherit' });
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach(child => {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 0));
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
