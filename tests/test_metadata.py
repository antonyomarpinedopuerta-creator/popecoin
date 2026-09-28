import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('metadata_check', ROOT / 'scripts/check-metadata.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MetadataTests(unittest.TestCase):
    def test_pinned_branding_and_logo(self):
        result = m.validate((ROOT / 'metadata/metadata.json').read_bytes(), (ROOT / 'metadata/papa-logo.png').read_bytes())
        self.assertEqual(result['logoSha256'], m.LOGO_SHA)

    def test_tampering_and_ambiguous_json_fail(self):
        data = (ROOT / 'metadata/metadata.json').read_bytes()
        image = (ROOT / 'metadata/papa-logo.png').read_bytes()
        bad = [b'{"name":"PAPA","name":"PAPA"}', data.replace(b'not affiliated', b'affiliated'),
               data.replace(b'https://raw.githubusercontent.com', b'http://127.0.0.1'), b' ' * 16385]
        extra = json.loads(data); extra['external_url'] = 'https://unreviewed.invalid'
        bad.append(json.dumps(extra).encode())
        for value in bad:
            with self.subTest(value=value[:30]), self.assertRaises(ValueError): m.validate(value, image)
        with self.assertRaises(ValueError): m.validate(data, image + b'!')

    def test_network_allowlist_redirects_and_size(self):
        class Response:
            status = 200
            headers = {}
            def geturl(self): return m.METADATA
            def read(self, length): return b'x' * length
            def __enter__(self): return self
            def __exit__(self, *args): pass
        class Opener:
            def open(self, *args, **kwargs): return Response()
        with self.assertRaises(ValueError): m.download('http://127.0.0.1', 20, Opener())
        with self.assertRaises(ValueError): m.download(m.METADATA, 20, Opener())
        with self.assertRaises(ValueError): m.NoRedirect().redirect_request(None, None, 302, None, None, 'http://127.0.0.1')
