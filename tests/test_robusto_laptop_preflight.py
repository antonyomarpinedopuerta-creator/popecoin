"""Regression checks with mocked observations; no mounts, RPC or key generation."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/robusto-laptop-custody-preflight.sh'


class LaptopPreflightTests(unittest.TestCase):
    def run_preflight(self, swap='exit 0', mount=None, route=None):
        with tempfile.TemporaryDirectory(prefix='robusto-preflight-test-') as temporary:
            root = Path(temporary)
            ram = root / 'ram'
            ram.mkdir(mode=0o700)
            commands = {'swapon': swap}
            if mount is not None:
                commands['findmnt'] = mount
            if route is not None:
                commands['awk'] = route
            for name, body in commands.items():
                executable = root / name
                executable.write_text('#!/bin/bash\n' + body + '\n')
                executable.chmod(0o700)
            env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ['PATH'],
                       ROBUSTO_RAM_DIR=str(ram))
            return subprocess.run(['bash', '-c', 'umask 077; bash "$1"', 'test', str(SCRIPT)],
                                  env=env, text=True, capture_output=True, check=False)

    def test_swap_query_failure_never_reports_inactive(self):
        result = self.run_preflight(swap='exit 1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('BLOCK Linux swap status could not be verified', result.stdout)
        self.assertNotIn('PASS Linux swap is inactive', result.stdout)

    def test_active_swap_blocks(self):
        result = self.run_preflight(swap="printf '/dev/test partition 1024 0 -2\\n'")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('BLOCK Linux swap is active', result.stdout)

    def test_mount_failure_or_missing_rw_never_reports_writable(self):
        for mount in ['exit 1', 'echo tmpfs', 'echo ro,nosuid,nodev,noexec',
                      'echo rw,ro,nosuid,nodev,noexec']:
            with self.subTest(mount=mount):
                result = self.run_preflight(mount=mount)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn('PASS dedicated tmpfs mount reports rw', result.stdout)

    def test_valid_mount_observation_keeps_write_access_unverified(self):
        result = self.run_preflight(mount='if [ "$5" = FSTYPE ]; then echo tmpfs; else echo rw,nosuid,nodev,noexec; fi')
        self.assertIn('PASS Linux swap is inactive', result.stdout)
        self.assertIn('PASS dedicated tmpfs mount reports rw; actual write access still requires owner verification', result.stdout)

    def test_route_query_failure_never_reports_offline(self):
        result = self.run_preflight(route='exit 1')
        self.assertNotEqual(result.returncode, 0)
        for version in ['IPv4', 'IPv6']:
            self.assertIn(f'BLOCK Linux default {version} route status could not be verified', result.stdout)
            self.assertNotIn(f'PASS no Linux default {version} route', result.stdout)

    def test_ipv6_default_route_blocks_even_without_ipv4_default(self):
        result = self.run_preflight(route='case "${@: -1}" in /proc/net/ipv6_route) echo 1;; /proc/net/route) echo 0;; *) /usr/bin/awk "$@";; esac')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('PASS no Linux default IPv4 route', result.stdout)
        self.assertIn('BLOCK Linux default IPv6 route exists', result.stdout)


if __name__ == '__main__':
    unittest.main()
