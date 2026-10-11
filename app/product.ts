import fs from "node:fs";
import path from "node:path";

const proposalPath = path.resolve(__dirname, "../config/robusto-tokenomics-10b9-alternative.json");
const productName = "ROBUSTO";
const expectedAllocations = [
  { label: "liquidity_market", tokens: "4000000000", basisPoints: 4000 },
  { label: "community", tokens: "3000000000", basisPoints: 3000 },
  { label: "strategic_reserve", tokens: "1500000000", basisPoints: 1500 },
  { label: "development_operations", tokens: "1499000000", basisPoints: 1499 },
  { label: "founder", tokens: "1000000", basisPoints: 1 },
];
const publicAllocationLabels: Record<string, string> = {
  liquidity_market: "Mercado y liquidez",
  community: "Comunidad",
  strategic_reserve: "Reserva estratégica",
  development_operations: "Desarrollo y operaciones",
  founder: "Fundador",
};

function loadProposal() {
  const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
  if (proposal.status !== "PROPOSED_NOT_APPROVED" || proposal.scope !== "OFFLINE_FIXTURE_ONLY" ||
      proposal.mainnetStatus !== "NOT_AUTHORIZED_FOR_MAINNET" || proposal.mainnetDisabled !== true ||
      proposal.operationsAuthorized !== false || proposal.decimalsAssumption !== 9 ||
      proposal.supplyTokens !== "10000000000" || proposal.supplyBaseUnits !== "10000000000000000000" ||
      proposal.fixedSupplyProposed !== true || proposal.additionalIssuanceProposed !== false ||
      proposal.founderPersonalFunding !== "0") {
    throw new Error("The public product page only accepts the exact offline 10B/9 proposal");
  }
  if (!Array.isArray(proposal.allocations) || proposal.allocations.length !== 5) {
    throw new Error("The public allocation proposal is incomplete");
  }
  proposal.allocations.forEach((row: { label: string; tokens: string; basisPoints: number }, index: number) => {
    const expected = expectedAllocations[index];
    if (!expected || row.label !== expected.label || row.tokens !== expected.tokens || row.basisPoints !== expected.basisPoints) {
      throw new Error("The public product page only accepts the exact unapproved allocation proposal");
    }
  });
  const total = proposal.allocations.reduce((sum: bigint, row: { tokens: string }) => {
    if (typeof row.tokens !== "string" || !/^(0|[1-9][0-9]*)$/.test(row.tokens)) {
      throw new Error("Proposal amounts must be canonical integer strings");
    }
    return sum + BigInt(row.tokens);
  }, 0n);
  if (total !== 10_000_000_000n) throw new Error("Proposed allocations do not conserve supply");
  if (proposal.founderVesting?.lockDaysAssumption !== 365 ||
      proposal.founderVesting?.linearDaysAssumption !== 730 ||
      proposal.founderVesting?.beneficiary !== null || proposal.founderVesting?.baseUtc !== null ||
      proposal.initialCirculationTokens !== null || proposal.price !== null || proposal.quoteLiquidity !== null) {
    throw new Error("Undecided production values must remain unset");
  }
  return proposal;
}

export function publicProductSnapshot() {
  const proposal = loadProposal();
  const allocations = proposal.allocations.map((row: {label: string; tokens: string; basisPoints: number}) => ({
    label: publicAllocationLabels[row.label],
    tokens: row.tokens,
    percent: `${(row.basisPoints / 100).toFixed(2)}%`,
  }));
  return {
    name: productName,
    symbol: productName,
    projectStatus: "NOT_DEPLOYED",
    availability: "NOT_AVAILABLE_FOR_PURCHASE",
    authorization: false,
    mainnetStatus: "NOT_AUTHORIZED_FOR_MAINNET",
    mainnetDisabled: true,
    scope: "OFFLINE_FIXTURE_ONLY",
    proposalStatus: proposal.status,
    founderPersonalFunding: "0",
    supply: {tokens: proposal.supplyTokens, decimals: proposal.decimalsAssumption, baseUnits: proposal.supplyBaseUnits, fixedProposed: true},
    allocations,
    initialCirculationTokens: null,
    founderVesting: {
      allocationTokens: "1000000",
      lockDaysAssumption: 365,
      linearDaysAssumption: 730,
      beneficiarySelected: false,
      datesSelected: false,
      approved: false,
    },
    trading: {
      status: "NO_MARKET_AVAILABLE",
      creatorApprovalRequiredForNormalSwaps: false,
      creatorComputerRequiredForNormalSwaps: false,
      marketMustBeSeparatelyAuthorized: true,
      protocolOperatorsMayAffectPoolStatusOrFees: true,
    },
  };
}

