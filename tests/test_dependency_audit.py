import importlib.util
import json
from pathlib import Path
import unittest

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('audit_gate', root / 'scripts/audit-dependencies.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
policy = json.loads((root / 'config/dependency-policy.json').read_text())


class AuditGateTests(unittest.TestCase):
    def yarn_fixture(self):
        return [{'type': 'auditAdvisory', 'data': {
            'advisory': {'github_advisory_id': 'GHSA-3gc7-fjrx-p6mg', 'module_name': 'bigint-buffer', 'severity': 'high'},
            'resolution': {'path': policy['yarn']['GHSA-3gc7-fjrx-p6mg']['paths'][0]}}},
            {'type': 'auditSummary', 'data': {'vulnerabilities': {'info': 0, 'low': 0, 'moderate': 0, 'high': 1, 'critical': 0}}}]

    def test_known_yarn_finding_is_reported_without_hiding_it(self):
        findings = audit.evaluate_yarn('\n'.join(map(json.dumps, self.yarn_fixture())), 8, policy)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0]['severity'], 'high')

    def test_unknown_yarn_paths_severity_and_advisories_fail(self):
        for field, value in [('github_advisory_id', 'GHSA-new'), ('severity', 'critical'), ('module_name', 'other')]:
            entries = self.yarn_fixture()
            entries[0]['data']['advisory'][field] = value
            with self.assertRaises(ValueError): audit.evaluate_yarn('\n'.join(map(json.dumps, entries)), 8, policy)
        entries = self.yarn_fixture()
        entries[0]['data']['resolution']['path'] = 'new-consumer>bigint-buffer'
        with self.assertRaises(ValueError): audit.evaluate_yarn('\n'.join(map(json.dumps, entries)), 8, policy)

    def test_unavailable_incomplete_or_inconsistent_audit_fails(self):
        for entries, code in [([], 0), ([{'type': 'error', 'data': 'offline'}], 1),
                              (self.yarn_fixture()[:1], 8), (self.yarn_fixture(), 0)]:
            with self.assertRaises(ValueError): audit.evaluate_yarn('\n'.join(map(json.dumps, entries)), code, policy)

    def test_rust_vulnerabilities_and_new_warnings_fail(self):
        report = {'vulnerabilities': {'found': False, 'count': 0, 'list': []}, 'warnings': {}}
        self.assertEqual(audit.evaluate_rust(report, 0, policy), [])
        with self.assertRaises(ValueError): audit.evaluate_rust(report, 1, policy)
        report['vulnerabilities']['found'] = True
        with self.assertRaises(ValueError): audit.evaluate_rust(report, 0, policy)
        report['vulnerabilities']['found'] = False
        report['warnings'] = {'unmaintained': [{'advisory': {'id': 'RUSTSEC-new'}, 'package': {'name': 'new', 'version': '1'}}]}
        with self.assertRaises(ValueError): audit.evaluate_rust(report, 0, policy)
