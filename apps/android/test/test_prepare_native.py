"""Regression checks for dependency selection from a signed Termux package index."""

import importlib.util
from pathlib import Path
import shutil
import subprocess
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location('prepare_native', Path(__file__).resolve().parents[1] / 'prepare-native.py')
PREPARE_NATIVE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREPARE_NATIVE)


def record(version):
    """One retained Node package revision with its own signed download identity."""
    return f'Package: nodejs-lts\nVersion: {version}\nFilename: node-{version}.deb\nSHA256: digest-{version}\n'


class PackageIndexTests(unittest.TestCase):
    """Retained older builds must never replace a newer ABI-compatible runtime."""

    def test_single_record_keeps_the_signed_download_fields(self):
        """An ordinary index needs no version comparison or network access."""
        with patch.object(PREPARE_NATIVE.subprocess, 'run') as compare:
            selected = PREPARE_NATIVE.package_index(record('24.22.2-1'))['nodejs-lts']
        self.assertEqual(selected['Filename'], 'node-24.22.2-1.deb')
        self.assertEqual(selected['SHA256'], 'digest-24.22.2-1')
        compare.assert_not_called()

    def test_retained_node_revision_in_either_index_order(self):
        """Exercise both dpkg comparison results, including the observed newest-first index."""
        for versions, result in [(('24.22.2-1', '24.22.2'), 1), (('24.22.2', '24.22.2-1'), 0)]:
            with self.subTest(versions=versions), patch.object(PREPARE_NATIVE.subprocess, 'run', return_value=subprocess.CompletedProcess([], result)) as compare:
                selected = PREPARE_NATIVE.package_index('\n'.join(map(record, versions)))['nodejs-lts']
                compare.assert_called_once_with(['dpkg', '--compare-versions', versions[1], 'gt', versions[0]], check=False)
                self.assertEqual(selected['Version'], '24.22.2-1')
                self.assertEqual(selected['SHA256'], 'digest-24.22.2-1')

    def test_comparison_error_fails_instead_of_silently_selecting_an_old_build(self):
        """A broken comparator is distinct from a valid older-or-equal result."""
        with patch.object(PREPARE_NATIVE.subprocess, 'run', return_value=subprocess.CompletedProcess(['dpkg'], 2)):
            with self.assertRaises(subprocess.CalledProcessError):
                PREPARE_NATIVE.package_index(record('24.22.2-1') + '\n' + record('24.22.2'))

    @unittest.skipUnless(shutil.which('dpkg'), 'the native Linux APK builder supplies dpkg')
    def test_native_debian_version_order(self):
        """Use the real APK build dependency for revisions, epochs, prereleases and numeric parts."""
        for newer, older in [('24.22.2-1', '24.22.2'), ('1:24.1', '99.0'), ('24.1', '24.1~rc1'), ('24.10', '24.9'), ('24.1-10', '24.1-2')]:
            for versions in [(newer, older), (older, newer)]:
                with self.subTest(versions=versions):
                    selected = PREPARE_NATIVE.package_index('\n'.join(map(record, versions)))['nodejs-lts']
                    self.assertEqual(selected['Version'], newer)
                    self.assertEqual(selected['SHA256'], f'digest-{newer}')


if __name__ == '__main__':
    unittest.main()
