import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('hosted', Path(__file__).resolve().parent.parent / 'scripts/collect-ci.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class HostedTests(unittest.TestCase):
    def fixture(self):
        return dict(databaseId=123, headSha='abc', status='completed', conclusion='success', event='push',
                    workflowName='Local candidate checks', url=f'https://github.com/{m.REPOSITORY}/actions/runs/123',
                    jobs=[dict(name=n, status='completed', conclusion='success') for n in ['validate (first)','validate (second)','compare']])

    def test_success_and_identity_rejections(self):
        run = self.fixture(); m.validate_run(run, 'abc', 123)
        for key, value in [('headSha','old'),('databaseId',124),('conclusion','failure'),('status','in_progress'),
                           ('url','https://github.com/another/repository/actions/runs/123'),('jobs',[]),('event','pull_request')]:
            wrong = copy.deepcopy(run); wrong[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError): m.validate_run(wrong,'abc',123)
        wrong = copy.deepcopy(run); wrong['jobs'][0]['conclusion']='skipped'
        with self.assertRaises(ValueError): m.validate_run(wrong,'abc',123)

    def test_archive_inventory_and_content_are_checked_without_extraction(self):
        import hashlib
        import io
        import json
        import tarfile
        import tempfile
        data = b'public bytes'
        report = {'sourceHashes': {'source.txt': hashlib.sha256(data).hexdigest()}, 'artifacts': {}}
        reproduction = {'status': 'passed'}
        manifest = (json.dumps({**report, 'reproduction': reproduction}, sort_keys=True, indent=2) + '\n').encode()
        entries = [('source.txt', data), ('rc-manifest.json', manifest)]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'candidate.tar.gz'
            def write(values):
                with tarfile.open(path, 'w:gz') as archive:
                    for name, value in values:
                        member = tarfile.TarInfo(name); member.size = len(value)
                        archive.addfile(member, io.BytesIO(value))
                path.with_suffix('.sha256').write_text(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n')
            write(entries); m.verify_archive(path, report, reproduction)
            for bad in [entries[:1], entries + [entries[0]], entries + [('../outside', b'x')],
                        [('source.txt', b'changed'), entries[1]], [entries[0], ('rc-manifest.json', b'{}')]]:
                write(bad)
                with self.assertRaises(ValueError): m.verify_archive(path, report, reproduction)
            write(entries); path.with_suffix('.sha256').write_text('wrong')
            with self.assertRaises(ValueError): m.verify_archive(path, report, reproduction)
