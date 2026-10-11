import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('meteora_audit_gate', Path(__file__).resolve().parents[1]/'scripts/audit-meteora-local.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

class MeteoraAuditTests(unittest.TestCase):
    def report(self):
        return {'database': {'advisory-count': 1290}, 'vulnerabilities': {'found': False, 'count': 0, 'list': []}, 'warnings': {}}

    def finding(self):
        return {'advisory': {'id': 'RUSTSEC-2025-0141', 'title': 'Maintenance warning'},
                'package': {'name': 'bincode', 'version': '1.3.3'}, 'versions': {'patched': []}}

    def test_warnings_alone_block_production_review(self):
        data = self.report()
        data['warnings'] = {'unmaintained': [self.finding()]}
        result = audit.evaluate(data, 0)
        self.assertEqual(result['status'], 'BLOCKED_FOR_PRODUCTION_REVIEW')
        self.assertEqual(len(result['warnings']), 1)
        self.assertEqual(result['exitCode'], 0)  # scanner code remains transparent

    def test_empty_report_is_not_security_approval(self):
        self.assertEqual(audit.evaluate(self.report(), 0)['status'], 'NO_FINDINGS_REPORTED_NOT_SECURITY_APPROVAL')

    def test_incomplete_inconsistent_and_failed_output_rejected(self):
        for field in ['database', 'vulnerabilities', 'warnings']:
            data = self.report(); del data[field]
            with self.assertRaises(ValueError): audit.evaluate(data, 0)
        for change in [{'found': True}, {'count': 1}, {'count': False}, {'list': None}]:
            data = self.report(); data['vulnerabilities'].update(change)
            with self.assertRaises(ValueError): audit.evaluate(data, 0)
        for code in [1, 2, -9]:
            with self.assertRaises(ValueError): audit.evaluate(self.report(), code)

    def test_all_findings_preserved_and_duplicates_rejected(self):
        data = self.report()
        data['vulnerabilities'] = {'found': True, 'count': 1, 'list': [self.finding()]}
        self.assertEqual(len(audit.evaluate(data, 1)['vulnerabilities']), 1)
        data['warnings'] = {'unsound': [self.finding()]}
        with self.assertRaisesRegex(ValueError, 'Duplicate'): audit.evaluate(data, 1)

    def test_malformed_identity_and_patch_evidence_rejected(self):
        for replacement in [None, {}, {'advisory': {}}]:
            data = self.report(); data['warnings'] = {'unsound': [replacement]}
            with self.assertRaises(ValueError): audit.evaluate(data, 0)
        data = self.report(); finding = self.finding(); finding['versions'] = {'patched': '>=2'}
        data['warnings'] = {'unsound': [finding]}
        with self.assertRaises(ValueError): audit.evaluate(data, 0)

if __name__ == '__main__': unittest.main()
