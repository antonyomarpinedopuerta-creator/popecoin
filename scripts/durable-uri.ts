import { utils } from "@coral-xyz/anchor";

/** Deliberately supports canonical SHA-256 raw/UnixFS CIDs and Arweave IDs only. */
export function durableUri(value: unknown): string {
  const fail = () => { throw new Error("A canonical content-addressed ipfs:// or ar:// URI is required"); };
  if (typeof value !== 'string' || Buffer.byteLength(value,'utf8') > 200) return fail();
  const match = /^(ipfs|ar):\/\/([^/]+)((?:\/[A-Za-z0-9._-]+)*)$/.exec(value);
  if (!match || match[3].split('/').some(p=>p==='.' || p==='..')) return fail();
  const [,scheme,id] = match;
  if (scheme === 'ar') {
    if (!/^[A-Za-z0-9_-]{43}$/.test(id) || Buffer.from(id,'base64url').toString('base64url') !== id) return fail();
  } else if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(id)) {
    const bytes = utils.bytes.bs58.decode(id);
    if (bytes.length !== 34 || bytes[0] !== 0x12 || bytes[1] !== 0x20) return fail();
  } else {
    if (!/^b[a-z2-7]{58}$/.test(id)) return fail();
    const alphabet='abcdefghijklmnopqrstuvwxyz234567'; const bytes: number[]=[];
    let bits=0, accumulator=0;
    for (const char of id.slice(1)) {
      accumulator=(accumulator<<5)|alphabet.indexOf(char); bits+=5;
      if (bits>=8) { bits-=8; bytes.push((accumulator>>>bits)&255); accumulator &= (1<<bits)-1; }
    }
    if (accumulator !== 0 || bytes.length !== 36 || bytes[0] !== 1 || ![0x55,0x70].includes(bytes[1]) || bytes[2] !== 0x12 || bytes[3] !== 0x20) return fail();
  }
  return value;
}
