/** Prepare public bytes for publication; never uploads, signs or selects production values. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { durableUri, verifyLocalMetadata } from './production-plan';

export function prepareMetadata(imageUri: unknown) {
  const image = durableUri(imageUri), branding = verifyLocalMetadata();
  const metadata = { name: branding.name, symbol: branding.symbol, description: branding.description, image };
  const bytes = JSON.stringify(metadata, null, 2) + '\n';
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), logoSha256: branding.logoSha256, imageUri: image };
}
export function verifyPublishedBytes(expected: ReturnType<typeof prepareMetadata>, metadata: Buffer, logo: Buffer) {
  if (!metadata.equals(Buffer.from(expected.bytes)) || createHash('sha256').update(logo).digest('hex') !== expected.logoSha256) {
    throw new Error('Published metadata or logo differs from the approved bytes');
  }
  return { metadataSha256: expected.sha256, logoSha256: expected.logoSha256 };
}
if (require.main === module) {
  const output = 'target/production-metadata'; fs.mkdirSync(output, { recursive: true });
  const manifest = `${output}/manifest.json`;
  fs.writeFileSync(manifest, JSON.stringify({ status:'incomplete' })+'\n');
  try {
    const config = JSON.parse(fs.readFileSync('config/production-plan.json','utf8'));
    const prepared = prepareMetadata(config.imageUri);
    if (process.argv.slice(2).some(a=>a!=='--verify-downloads')) throw new Error('Unsupported option');
    let verification;
    if (process.argv.includes('--verify-downloads')) {
      durableUri(config.metadataUri);
      verification = verifyPublishedBytes(prepared, fs.readFileSync(`${output}/downloaded-metadata.json`), fs.readFileSync(`${output}/downloaded-logo.png`));
    }
    fs.writeFileSync(`${output}/metadata.json`, prepared.bytes);
    fs.writeFileSync(manifest, JSON.stringify({ status:verification?'downloaded-bytes-match':'prepared-not-published',
      imageUri:prepared.imageUri, metadataUri:config.metadataUri, metadataSha256:prepared.sha256, logoSha256:prepared.logoSha256,
      note:'Operator must verify URI provenance, persistent hosting and authority policy; no publication or transaction was performed' },null,2)+'\n');
    console.log(`Prepared public metadata in ${output}; publication/approval remain external`);
  } catch (error) {
    fs.writeFileSync(manifest, JSON.stringify({status:'failed'})+'\n');
    console.error((error as Error).message); process.exitCode=1;
  }
}
