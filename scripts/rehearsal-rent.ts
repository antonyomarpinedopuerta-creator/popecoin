/** Public Devnet rent estimate only. No CLI configuration, wallet, simulation or send. */
export const REHEARSAL_RPC = 'https://api.devnet.solana.com';
export const REHEARSAL_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
type ReadRpc = (method: string, params: unknown[]) => Promise<unknown>;
export async function publicRpc(method: string, params: unknown[]): Promise<unknown> {
  if (!['getGenesisHash', 'getMinimumBalanceForRentExemption'].includes(method))
    throw new Error('RPC method is not read-only allowlisted');
  const response = await fetch(REHEARSAL_RPC, { method: 'POST', redirect: 'error',
    signal: AbortSignal.timeout(15000), headers: {'Content-Type':'application/json'},
    body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}) });
  if (!response.ok) throw new Error('Devnet RPC HTTP failure');
  const body = await response.json() as {jsonrpc?: string; id?: number; result?: unknown; error?: unknown};
  if (body.jsonrpc !== '2.0' || body.id !== 1 || body.error || body.result === undefined)
    throw new Error('Invalid Devnet RPC response');
  return body.result;
}
export async function estimateRehearsalRent(binaryBytes: number, maxProgramBytes: number, rpc: ReadRpc = publicRpc) {
  if (!Number.isSafeInteger(binaryBytes) || binaryBytes < 1 || !Number.isSafeInteger(maxProgramBytes) ||
      maxProgramBytes < binaryBytes || maxProgramBytes > 10 * 1024 * 1024)
    throw new Error('Explicit valid ELF and maximum program lengths required');
  if (await rpc('getGenesisHash', []) !== REHEARSAL_GENESIS) throw new Error('Devnet genesis mismatch');
  // Loader-v3 layouts only; the eventual reviewed deploy messages must use these lengths.
  const sizes = {program:36, programData:45+maxProgramBytes, buffer:37+binaryBytes,
    mint:82, source:165, destination:165, vesting:145, vault:165};
  const rents: Record<string,string> = {};
  for (const [name, bytes] of Object.entries(sizes)) {
    const value = await rpc('getMinimumBalanceForRentExemption', [bytes,{commitment:'confirmed'}]);
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)
      throw new Error('Invalid rent response');
    rents[name] = String(value);
  }
  if (await rpc('getGenesisHash', []) !== REHEARSAL_GENESIS) throw new Error('Devnet genesis changed');
  const peak = Object.values(rents).reduce((sum, n)=>sum+BigInt(n),0n);
  return {status:'RENT ESTIMATE ONLY — NOT AN APPROVAL OR TOTAL COST CAP', rpc:REHEARSAL_RPC,
    cluster:'devnet', genesisHash:REHEARSAL_GENESIS, observedAt:new Date().toISOString(),
    loader:'BPFLoaderUpgradeab1e11111111111111111111111', binaryBytes,maxProgramBytes,
    accountBytes:sizes,rentLamports:rents,peakRentLamports:peak.toString(),
    peakRentSol:`${peak/1000000000n}.${(peak%1000000000n).toString().padStart(9,'0')}`,
    feeCapLamports:null,totalCapLamports:null,
    pending:'Price exact unsigned messages with getFeeForMessage; approve each transaction separately. No refunds credited. No retries authorized.'};
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args.some(a=> !/^[1-9][0-9]*$/.test(a))) {
    console.error('Usage: ts-node scripts/rehearsal-rent.ts ELF_BYTES MAX_PROGRAM_BYTES'); process.exitCode=1;
  } else estimateRehearsalRent(Number(args[0]),Number(args[1]))
    .then(result=>console.log(JSON.stringify(result,null,2)))
    .catch(()=>{console.error('Devnet rent estimation failed; no estimate is approved');process.exitCode=1;});
}
