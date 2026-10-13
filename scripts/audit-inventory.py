#!/usr/bin/env python3
"""Read-only, local-only inventory for the ROBUSTO external audit handoff.

This tool hashes existing files and reads repository/toolchain metadata. It does
not build, write files, access a network, create keys, or certify deployment.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OFFICIAL = Path("target/meteora-official/damm-v2-a85c926607433f23f0ea60f4ca7b1ae92f4156cb")
EXPECTED_METEORA_COMMIT = "a85c926607433f23f0ea60f4ca7b1ae92f4156cb"
EXPECTED_METEORA_LOCK = "b5ec7c2a5793afc7f8c46169b23cb370bd90f13a86e753beec7bc01f5c42e1d0"

CRITICAL_FILES = [
    "Anchor.toml", "Cargo.toml", "Cargo.lock", "rust-toolchain.toml",
    "programs/popecoin_vesting/Cargo.toml",
    "programs/popecoin_vesting/src/lib.rs",
    "programs/popecoin_vesting/src/constants.rs",
    "programs/popecoin_vesting/src/error.rs",
    "programs/popecoin_vesting/src/state.rs",
    "programs/popecoin_vesting/src/instructions.rs",
    "programs/popecoin_vesting/src/instructions/initialize.rs",
    "programs/popecoin_vesting/src/instructions/deposit.rs",
    "programs/popecoin_vesting/src/instructions/release.rs",
    "target/idl/popecoin_vesting.json", "target/types/popecoin_vesting.ts",
    "target/release-build-record.json", "target/reproducibility.json",
    "scripts/build-release.py",
    "config/robusto-tokenomics-10b9-alternative.json",
    "config/robusto-production.json", "config/robusto-meteora-local.json",
    "scripts/robusto-10b9-offline.ts", "scripts/robusto-10b9-vesting-preparation.ts",
    "scripts/robusto-10b9-mint-inventory.ts", "scripts/robusto-production.ts",
    "scripts/robusto-meteora-local.ts", "package.json", "yarn.lock",
]
ARTIFACTS = [
    "target/deploy/popecoin_vesting.so",
    "target/meteora-official/build/cp_amm.so",
    "target/meteora-official/cargo-build/sbpf-solana-solana/release/cp_amm.so",
    "target/meteora-official/reproduced-build/cp_amm.so",
    "target/robusto-final-public-programs/token.so",
    "target/robusto-final-public-programs/ata.so",
    "target/robusto-final-public-programs/token2022.so",
]
METEORA_FILES = [
    "Cargo.lock", "programs/cp-amm/Cargo.toml",
    "programs/cp-amm/src/math/u128x128_math.rs",
    "programs/cp-amm/src/math/utils_math.rs",
    "programs/cp-amm/src/math/fee_math.rs",
    "programs/cp-amm/src/math/safe_math.rs",
    "programs/cp-amm/src/liquidity_handler/concentrated_liquidity.rs",
    "programs/cp-amm/src/state/position.rs",
]
VERSION_COMMANDS = {
    "rustc": ["rustc", "--version"], "cargo": ["cargo", "--version"],
    "anchor": ["anchor", "--version"], "solana": ["solana", "--version"],
    "node": ["node", "--version"], "npm": ["npm", "--version"],
}


def sha256(path: Path) -> str | None:
    try:
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for block in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()
    except OSError:
        return None


def git_value(root: Path, *args: str) -> str | None:
    try:
        return subprocess.run(["git", *args], cwd=root, check=True, text=True,
                              capture_output=True, timeout=5).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def versions() -> dict[str, str | None]:
    result = {}
    for name, command in VERSION_COMMANDS.items():
        try:
            result[name] = subprocess.run(command, cwd=ROOT, check=True, text=True,
                                          capture_output=True, timeout=5).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            result[name] = None
    return result


def file_hashes(root: Path, names: list[str]) -> dict[str, dict[str, str | None]]:
    return {name: {"sha256": sha256(root / name),
                   "present": (root / name).is_file()} for name in names}


def lock_summary(path: Path) -> dict:
    try:
        lock = tomllib.loads(path.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError):
        return {"present": False, "packageCount": 0, "selected": {}}
    packages = lock.get("package", [])
    wanted = {"ruint", "bincode", "cp-amm", "anchor-lang", "anchor-spl"}
    selected = {}
    for package in packages:
        if package.get("name") in wanted:
            selected.setdefault(package["name"], []).append({
                "version": package.get("version"), "source": package.get("source")})
    return {"present": True, "packageCount": len(packages), "selected": selected,
            "allPackagesHaveResolvedVersions": all(bool(p.get("version")) for p in packages)}


def meteora_build_record(root: Path) -> dict:
    try:
        record = json.loads((root / "target/meteora-official/build-record.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"present": False, "binaryMatches": {}}
    expected = record.get("binarySha256")
    outputs = ["target/meteora-official/build/cp_amm.so",
               "target/meteora-official/reproduced-build/cp_amm.so",
               "target/meteora-official/cargo-build/sbpf-solana-solana/release/cp_amm.so"]
    return {"present": True, "sourceCommit": record.get("programCommit"),
            "cargoLockSha256": record.get("cargoLockSha256"), "expectedBinarySha256": expected,
            "binaryMatches": {name: sha256(root / name) == expected for name in outputs},
            "toolchain": {key: record.get(key) for key in ("agave", "platformTools", "sbfRust", "nativeRust")}}


def source_tree_digest(root: Path, base: Path) -> dict:
    if not base.is_dir():
        return {"present": False, "fileCount": 0, "sha256": None}
    entries = []
    for path in sorted(p for p in base.rglob("*") if p.is_file() and ".git" not in p.relative_to(base).parts):
        rel = path.relative_to(base).as_posix()
        entries.append(f"{sha256(path)}  {rel}\n")
    digest = hashlib.sha256("".join(entries).encode()).hexdigest()
    return {"present": True, "fileCount": len(entries), "sha256": digest}


def build_record_check(root: Path, critical_hashes: dict) -> dict:
    record_path = root / "target/release-build-record.json"
    try:
        record = json.loads(record_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"present": False, "sourceMatches": {}, "artifactMatches": {}}
    source_matches = {name: critical_hashes.get(name, {}).get("sha256") == expected
                      for name, expected in record.get("sourceHashes", {}).items()}
    artifact_matches = {name: sha256(root / name) == expected
                        for name, expected in record.get("outputHashes", {}).items()}
    return {"present": True, "recordHasCommit": bool(record.get("commit")),
            "sourceMatchCount": sum(source_matches.values()),
            "sourceEntryCount": len(source_matches), "sourceMismatches": [k for k, v in source_matches.items() if not v],
            "artifactMatches": artifact_matches}


def build_inventory(root: Path = ROOT) -> dict:
    head = git_value(root, "rev-parse", "HEAD")
    branch = git_value(root, "branch", "--show-current")
    status = git_value(root, "status", "--porcelain")
    critical = file_hashes(root, CRITICAL_FILES)
    met_lock_hash = sha256(root / OFFICIAL / "Cargo.lock")
    try:
        audit = json.loads((root / "docs/evidence/robusto/meteora-offline-audit-2026-10-11.json").read_text())
    except (OSError, json.JSONDecodeError):
        audit = {}
    history = {}
    for name in ("target/robusto-10b9-runtime-report.json", "target/robusto-10b9-integration-report.json"):
        try:
            report = json.loads((root / name).read_text(encoding="utf-8"))
            history[name] = {"status": report.get("status"), "head": report.get("head"),
                             "matchesCurrentHead": report.get("head") == head,
                             "scope": report.get("scope")}
        except (OSError, json.JSONDecodeError):
            history[name] = {"present": False}
    yarn = root / "yarn.lock"
    yarn_text = yarn.read_text(encoding="utf-8") if yarn.is_file() else ""
    try:
        package = json.loads((root / "package.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        package = {}
    direct_js = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
    ranged_js = {name: spec for name, spec in direct_js.items()
                 if spec.startswith(("^", "~", ">", "<", "*")) or "||" in spec}
    return {
        "schema": 1,
        "scope": "OFFLINE_FIXTURE_ONLY",
        "mainnetStatus": "NOT_AUTHORIZED_FOR_MAINNET",
        "mainnetDisabled": True,
        "readOnly": True,
        "independentlyAudited": False,
        "repository": {"head": head, "branch": branch, "worktreeClean": status == "",
                        "originMasterTrackingRef": git_value(root, "rev-parse", "refs/remotes/origin/master"),
                        "trackingRefIsLiveRemoteVerification": False},
        "toolchains": versions(),
        "criticalFiles": critical,
        "artifacts": file_hashes(root, ARTIFACTS),
        "releaseBuildRecord": build_record_check(root, critical),
        "meteora": {
            "sourceCommit": EXPECTED_METEORA_COMMIT,
            "lockSha256": met_lock_hash,
            "lockHashMatchesRecordedEvidence": met_lock_hash == EXPECTED_METEORA_LOCK,
            "sourceTree": source_tree_digest(root, root / OFFICIAL / "programs/cp-amm/src"),
            "reviewedFiles": file_hashes(root / OFFICIAL, METEORA_FILES),
            "advisorySnapshotStatus": audit.get("status"),
            "advisoryLockHashMatches": audit.get("cargoLockSha256") == met_lock_hash,
            "advisoryCount": len(audit.get("vulnerabilities", [])) + len(audit.get("warnings", [])),
            "lockDependencySummary": lock_summary(root / OFFICIAL / "Cargo.lock"),
            "buildRecord": meteora_build_record(root),
            "runtimeCallsiteAssessment": {
                "M03_RUSTSEC_2026_0220": "REACHABLE_SHIFT_CALLS; incorrect overflow flag reproduced locally; reviewed truncation callsites ignore flag; no balance or economic impact demonstrated",
                "M04_RUSTSEC_2025_0141": "bincode 1.3.3 is compiled through Anchor in the recorded SBF build; cp-amm source has no bincode or ProgramData callsite; Program::try_from only checks id/executable; runtime deserialization reachability not demonstrated; maintenance warning, no concrete exploit demonstrated",
            },
        },
        "historicalEvidence": history,
        "dependencyLocks": {"cargoLock": lock_summary(root / "Cargo.lock"),
                            "lockfilePresence": {"Cargo.lock": (root / "Cargo.lock").is_file(),
                                                 "yarn.lock": yarn.is_file()},
                            "javascriptManifestRanges": ranged_js,
                            "javascriptRangesResolvedByYarnLock": bool(yarn.is_file()),
                            "yarnLock": {"present": yarn.is_file(),
                                         "sha256": sha256(yarn) if yarn.is_file() else None,
                                         "resolvedVersionEntryCount": len(re.findall(r'^  version "[^"\n]+"$', yarn_text, re.M))}},
        "limitations": [
            "Hashes bind local bytes to this report only; report and files need independent retention/authentication.",
            "The local origin/master tracking ref is not a live GitHub query.",
            "Tool versions and local artifacts do not attest to a deployment or external build.",
            "Historical runtime reports tied to other HEADs are not counted as tests of this revision.",
            "No compilation, test, key generation, signing, transaction, RPC or network access is performed.",
        ],
    }


if __name__ == "__main__":
    print(json.dumps(build_inventory(), indent=2, sort_keys=True))
