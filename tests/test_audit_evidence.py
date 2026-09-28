import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('audit_evidence', Path(__file__).resolve().parent.parent / 'scripts/prepare-audit.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class AuditEvidenceTests(unittest.TestCase):
    def test_only_current_success_is_accepted(self):
        m.validate_evidence({'status':'passed','head':'current'}, 'current')
        m.validate_evidence({'status':'reviewed-findings-only','head':'current'}, 'current','reviewed-findings-only')
        for value in [{}, {'status':'incomplete','head':'current'}, {'status':'passed','head':'old'},
                      {'status':'passed','head':'current','dirty':True}]:
            with self.subTest(value=value), self.assertRaises(ValueError): m.validate_evidence(value, 'current')
