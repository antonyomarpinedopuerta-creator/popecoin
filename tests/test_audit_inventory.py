import importlib.util
from pathlib import Path
import unittest

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
        self.assertTrue(all(not report.get("matchesCurrentHead", False) for report in reports.values()))

    def test_file_hash_missing_is_explicit(self):
        result = MODULE.file_hashes(ROOT, ["a/path/that/does/not/exist"])
        self.assertFalse(result["a/path/that/does/not/exist"]["present"])
        self.assertIsNone(result["a/path/that/does/not/exist"]["sha256"])


if __name__ == "__main__":
    unittest.main()
