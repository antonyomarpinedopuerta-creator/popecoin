import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("audit_inventory", ROOT / "scripts/audit-inventory.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class AuditInventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = MODULE.build_inventory()

    def test_inventory_is_offline_and_non_certifying(self):
        inventory = self.inventory
        self.assertEqual(inventory["scope"], "OFFLINE_FIXTURE_ONLY")
        self.assertEqual(inventory["mainnetStatus"], "NOT_AUTHORIZED_FOR_MAINNET")
        self.assertTrue(inventory["mainnetDisabled"])
        self.assertTrue(inventory["readOnly"])
        self.assertFalse(inventory["independentlyAudited"])
        self.assertFalse(inventory["repository"]["trackingRefIsLiveRemoteVerification"])
        for name in ("scripts/robusto-10b9-operational-plan.ts",
                     "docs/evidence/robusto/10b9-operational-plan.json"):
            self.assertTrue(inventory["criticalFiles"][name]["present"])
            self.assertEqual(inventory["criticalFiles"][name]["sha256"], MODULE.sha256(ROOT / name))

    def test_release_record_compares_source_and_output_hashes(self):
        inventory = self.inventory
        check = inventory["releaseBuildRecord"]
        self.assertEqual(check["sourceMatchCount"], check["sourceEntryCount"])
        self.assertFalse(check["sourceMismatches"])
        self.assertTrue(all(check["artifactMatches"].values()))

    def test_meteora_source_and_advisory_snapshot_are_pinned(self):
        inventory = self.inventory["meteora"]
        self.assertEqual(inventory["sourceCommit"], MODULE.EXPECTED_METEORA_COMMIT)
        self.assertTrue(inventory["lockHashMatchesRecordedEvidence"])
        self.assertTrue(inventory["advisoryLockHashMatches"])
        self.assertGreater(inventory["sourceTree"]["fileCount"], 0)
        self.assertEqual(inventory["buildInputHashes"]["sourceFileCount"], 129)
        self.assertEqual(inventory["buildInputHashes"]["matchedCount"], 129)
        self.assertFalse(inventory["buildInputHashes"]["mismatches"])
        self.assertEqual(inventory["advisoryCount"], 10)
        self.assertTrue(inventory["buildRecord"]["binaryMatches"]["target/meteora-official/build/cp_amm.so"])
        self.assertTrue(inventory["buildRecord"]["binaryMatches"]["target/meteora-official/reproduced-build/cp_amm.so"])
        self.assertFalse(inventory["buildRecord"]["binaryMatches"]["target/meteora-official/cargo-build/sbpf-solana-solana/release/cp_amm.so"])
        self.assertIn("no balance or economic impact demonstrated", inventory["runtimeCallsiteAssessment"]["M03_RUSTSEC_2026_0220"])
        self.assertIn("runtime deserialization reachability not demonstrated", inventory["runtimeCallsiteAssessment"]["M04_RUSTSEC_2025_0141"])

    def test_historical_reports_are_not_misrepresented_as_current(self):
        reports = self.inventory["historicalEvidence"]
        self.assertTrue(reports)
        self.assertIn("target/unsigned-runtime-report.json", reports)
        for report in reports.values():
            if "head" in report:
                self.assertEqual(report["matchesCurrentHead"],
                                 report["head"] == self.inventory["repository"]["head"])

    def test_pinned_source_detects_tampering_and_missing_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / MODULE.OFFICIAL / "programs/cp-amm/src/lib.rs"
            source.parent.mkdir(parents=True)
            source.write_bytes(b"reviewed fixture")
            name = "programs/cp-amm/src/lib.rs"
            record = root / "target/meteora-official/build-record.json"
            record.write_text(json.dumps({"sourceHashes": {name: MODULE.sha256(source)}}))
            self.assertEqual(MODULE.meteora_source_record(root)["matchedCount"], 1)
            source.write_bytes(b"altered fixture")
            result = MODULE.meteora_source_record(root)
            self.assertEqual(result["matchedCount"], 0)
            self.assertEqual(result["mismatches"], [name])
            source.unlink()
            self.assertEqual(MODULE.meteora_source_record(root)["mismatches"], [name])

    def test_stale_and_current_reports_are_distinguished(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "target").mkdir()
            head = "1" * 40
            for report_head in ["0" * 40, head]:
                for name in ["unsigned-runtime-report.json", "robusto-10b9-integration-report.json"]:
                    (root / "target" / name).write_text(json.dumps({"head": report_head, "status": "passed"}))
                with patch.object(MODULE, "git_value", return_value=head), patch.object(MODULE, "versions", return_value={}):
                    reports = MODULE.build_inventory(root)["historicalEvidence"]
                self.assertEqual(len(reports), 2)
                for report in reports.values():
                    self.assertEqual(report["matchesCurrentHead"], report_head == head)

    def test_file_hash_missing_is_explicit(self):
        result = MODULE.file_hashes(ROOT, ["a/path/that/does/not/exist"])
        self.assertFalse(result["a/path/that/does/not/exist"]["present"])
        self.assertIsNone(result["a/path/that/does/not/exist"]["sha256"])


if __name__ == "__main__":
    unittest.main()
