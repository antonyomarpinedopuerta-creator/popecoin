/** Local POSIX fixture tombstones. No transaction bytes, identities, keys or authorization. */
import fs from 'node:fs';
import path from 'node:path';
const FORMAT = 'ROBUSTO_UNSIGNED_FIXTURE_JOURNAL_V1';
function syncDirectory(directory: string) {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try {fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
}
function privateDirectory(directory: string) {
  const s = fs.lstatSync(directory);
  if (!s.isDirectory() || s.isSymbolicLink() || (s.mode & 0o777) !== 0o700 || s.uid !== process.getuid?.() ||
      fs.realpathSync(directory) !== directory) throw Error('Unsafe fixture journal directory');
}
function atomicRecord(directory: string, value: object) {
  const temporary = path.join(directory, 'record.pending');
  const fd = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  try {fs.writeFileSync(fd, JSON.stringify(value)+'\n');fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
  fs.renameSync(temporary, path.join(directory, 'record.json'));
  syncDirectory(directory);
}
function validateRoot(directory: string) {
  privateDirectory(directory);
  const file = path.join(directory, 'record.json');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const s=fs.fstatSync(fd);
    if (!s.isFile() || s.size > 256 || (s.mode & 0o777)!==0o600 || s.uid!==process.getuid?.() || s.nlink!==1)
      throw Error('Unsafe fixture journal format');
    if (fs.readFileSync(fd,'utf8')!==JSON.stringify({format:FORMAT,authorization:false})+'\n')
      throw Error('Corrupt or incomplete fixture journal');
  } finally {fs.closeSync(fd);}
  if (fs.existsSync(path.join(directory,'record.pending'))) throw Error('Uncertain fixture journal initialization');
}
/** Explicit creation only; never silently recreate an existing or missing journal on review. */
export function initializeFixtureJournal(directory: string) {
  directory=path.resolve(directory);
  if (directory===path.parse(directory).root) throw Error('Dedicated fixture directory required');
  if (fs.realpathSync(path.dirname(directory))!==path.dirname(directory)) throw Error('Symlink ancestor forbidden');
  fs.mkdirSync(directory,{mode:0o700});
  syncDirectory(path.dirname(directory));
  atomicRecord(directory,{format:FORMAT,authorization:false});
}
export function openFixtureJournal(directory: string) {
  directory=path.resolve(directory);validateRoot(directory);
  return Object.freeze({reserve(messageSha256: string) {
    if (!/^[0-9a-f]{64}$/.test(messageSha256)) throw Error('Public message digest required');
    validateRoot(directory);
    const claim=path.join(directory,messageSha256);
    try {fs.mkdirSync(claim,{mode:0o700});}
    catch(e) {
      if ((e as NodeJS.ErrnoException).code==='EEXIST')
        throw Error('Duplicate or uncertain fixture request; persistent tombstone exists');
      throw e;
    }
    // A crash at any following instruction leaves a permanent conservative reservation.
    // Never remove/reap a claim, even when its record is missing, partial or corrupt.
    syncDirectory(directory);
    atomicRecord(claim,{format:FORMAT,messageSha256,state:'CONSUMED_NOT_AUTHORIZED',authorization:false});
  }});
}
