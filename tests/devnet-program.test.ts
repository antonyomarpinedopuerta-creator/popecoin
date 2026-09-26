import test from "node:test";
import assert from "node:assert/strict";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { inspectProgram, PROGRAM_DATA, UPGRADEABLE_LOADER } from "../scripts/devnet-program";

function fixture() {
  const info = (data: Buffer, executable: boolean): AccountInfo<Buffer> => ({ data, executable, owner: UPGRADEABLE_LOADER, lamports: 1, rentEpoch: 0 });
  const program = Buffer.alloc(36); program.writeUInt32LE(2); PROGRAM_DATA.toBuffer().copy(program, 4);
  const data = Buffer.alloc(49); data.writeUInt32LE(3); data.writeBigUInt64LE(499370833n, 4); data[12] = 1;
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]).copy(data, 45);
  return { program: info(program, true), data: info(data, false) };
}
test("Devnet program reader validates loader linkage without claiming local correspondence", () => {
  const f = fixture(); const result = inspectProgram(f.program, f.data);
  assert.equal(result.deployedSlot, "499370833"); assert.equal(result.historicalMatch, false);
  assert.equal(result.upgradeAuthorityActive, true);
  f.data.data[12] = 0; assert.equal(inspectProgram(f.program, f.data).upgradeAuthorityActive, false);
});
test("Devnet program reader rejects malformed loader accounts", () => {
  for (const attack of ["owner", "link", "size", "variant", "option", "elf", "executable"]) {
    const f = fixture();
    if (attack === "owner") f.program.owner = PublicKey.default;
    if (attack === "link") f.program.data[4] ^= 1;
    if (attack === "size") f.data.data = Buffer.alloc(12);
    if (attack === "variant") f.data.data[0] = 2;
    if (attack === "option") f.data.data[12] = 2;
    if (attack === "elf") f.data.data[45] = 0;
    if (attack === "executable") f.data.executable = true;
    assert.throws(() => inspectProgram(f.program, f.data), /Invalid|ELF/, attack);
  }
});
