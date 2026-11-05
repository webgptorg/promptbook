"""Package the signed Termux Android binaries and only their ELF dependencies."""

from concurrent.futures import ThreadPoolExecutor
from gzip import decompress
from hashlib import sha256
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


TERMUX = 'https://packages.termux.dev/apt/termux-main'
KEYRING_REF = '2c48b8990c9ef52071ad76b12ae82b3ab94b6f89'
TERMUX_API = 'https://api.github.com/repos/termux/termux-packages'
KEYRING_URL = f'https://raw.githubusercontent.com/termux/termux-packages/{KEYRING_REF}/packages/termux-keyring'
PREFIX = 'data/data/com.termux/files/usr'
SYSTEM_LIBRARIES = {'libandroid.so', 'libc.so', 'libdl.so', 'liblog.so', 'libm.so'}
TOOLS = {
    'bin/node': 'libptbk_node.so',
    'bin/git': 'libptbk_git.so',
    'libexec/git-core/git-remote-https': 'libptbk_git_remote.so',
    'bin/bash': 'libptbk_bash.so',
    'bin/rg': 'libptbk_rg.so',
}


def run(*args):
    return subprocess.check_output(args, text=True)


def download(url, output, expected=None):
    """Download bytes from an official repository, and check the signed index's hash."""
    if expected and output.is_file() and sha256(output.read_bytes()).hexdigest() == expected:
        return output
    subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--retry', '3',
                    '--max-time', '120', url, '-o', output], check=True)
    if expected and sha256(output.read_bytes()).hexdigest() != expected:
        raise ValueError(f'The checksum of {url} differs from the signed index.')
    return output


def repository_index(work, arch):
    """Verify the apt Release signature before using any package checksums."""
    keys = [download(f'{KEYRING_URL}/{key}.gpg', work / f'{key}.gpg') for key in ('grimler', 'termux-autobuilds')]
    signed = download(f'{TERMUX}/dists/stable/InRelease', work / 'InRelease')
    release = work / 'Release'
    run('gpgv', '--keyring', keys[0], '--keyring', keys[1], '--output', release, signed)
    path = f'main/binary-{arch}/Packages.gz'
    checksums = release.read_text().split('\nSHA256:\n', 1)[1].split('\nSHA512:\n', 1)[0]
    digest = next(line.split()[0] for line in checksums.splitlines() if line.endswith(f' {path}'))
    index = download(f'{TERMUX}/dists/stable/{path}', work / 'Packages.gz', digest)
    packages = {}
    for record in decompress(index.read_bytes()).decode().strip().split('\n\n'):
        fields = dict(line.split(': ', 1) for line in record.splitlines() if re.match(r'^[\w-]+: ', line))
        packages[fields['Package']] = fields
    return packages


def download_packages(work, index):
    """Resolve the Termux package dependencies from one coherent index."""
    pending = ['nodejs-lts', 'git', 'bash', 'ripgrep', 'ca-certificates']
    selected = {}
    while pending:
        name = pending.pop()
        if name in selected:
            continue
        fields = selected[name] = index[name]
        for dependency in fields.get('Depends', '').split(','):
            if not dependency.strip():
                continue
            options = [item.strip().split()[0] for item in dependency.split('|')]
            pending.append(next(item for item in options if item in index))
    if int(selected['nodejs-lts']['Version'].split('.')[0]) < 24:
        raise ValueError('The APK requires a Node.js runtime of at least version 24.')

    def fetch(name):
        fields = selected[name]
        return download(f"{TERMUX}/{fields['Filename']}", work / f'{name}.deb', fields['SHA256'])
    with ThreadPoolExecutor(max_workers=8) as pool:
        archives = list(pool.map(fetch, sorted(selected)))
    destination = work / 'packages'
    destination.mkdir(exist_ok=True)
    for archive in archives:
        with subprocess.Popen(['dpkg-deb', '--fsys-tarfile', archive], stdout=subprocess.PIPE) as package:
            subprocess.run(['tar', '-x', '--no-same-owner', '-C', destination], stdin=package.stdout, check=True)
            if package.wait() != 0:
                raise ValueError(f'Could not extract {archive.name}.')
    return selected


def pack_libraries(source, native, arch):
    """Keep ELF files installed by Android in nativeLibraryDir and retain their linker names."""
    pending = [(source / path, target) for path, target in TOOLS.items()]
    dependencies = {}
    while pending:
        binary, target = pending.pop()
        header = run('readelf', '-hW', binary)
        expected_machine = 'AArch64' if arch == 'aarch64' else 'Advanced Micro Devices X86-64'
        if expected_machine not in header:
            raise ValueError(f'{binary.name} is not a {arch} ELF file.')
        segments = run('readelf', '-lW', binary)
        if any(int(line.split()[-1], 16) < 0x4000 for line in segments.splitlines() if line.strip().startswith('LOAD ')):
            raise ValueError(f'{binary.name} does not support Android 16 KB pages.')
        for needed in re.findall(r'\(NEEDED\).*?\[([^\]]+)\]', run('readelf', '-dW', binary)):
            if needed in SYSTEM_LIBRARIES or needed in dependencies:
                continue
            if not re.fullmatch(r'lib[\w+.-]+\.so(?:\.\d+)*', needed):
                raise ValueError(f'Unexpected ELF dependency: {needed}')
            dependency = source / 'lib' / needed
            packed = f"libptbk_dep_{needed.removeprefix('lib').replace('.', '_').replace('+', 'p')}.so"
            dependencies[needed] = packed
            pending.append((dependency, packed))
        if target in ('libptbk_git.so', 'libptbk_git_remote.so'):
            # The Termux Git build invokes a fixed shell path. The system shell is
            # available to this APK and fits in the existing read-only string slot.
            original = f'/{PREFIX}/bin/sh\0'.encode()
            shell = b'/system/bin/sh\0'.ljust(len(original), b'\0')
            (native / target).write_bytes(binary.read_bytes().replace(original, shell))
        else:
            shutil.copyfile(binary, native / target)
    return dependencies


def include_source(work, licenses, package, version):
    """Ship the matching source and patches for the bundled GPL programs."""
    recipe_path = f'packages/{package}'
    history = json.loads(download(f'{TERMUX_API}/commits?path={recipe_path}&per_page=12',
                                  work / f'{package}-history.json').read_text())
    for commit in history:
        ref = commit['sha']
        recipe_url = f'https://raw.githubusercontent.com/termux/termux-packages/{ref}/{recipe_path}/build.sh'
        recipe = download(recipe_url, licenses / f'{package}-termux-build.sh').read_text()
        upstream = re.search(r'^TERMUX_PKG_VERSION="?([\d.]+)"?$', recipe, re.M)
        revision = re.search(r'^TERMUX_PKG_REVISION="?(\d+)"?$', recipe, re.M)
        if not upstream or version != upstream[1] + (f'-{revision[1]}' if revision else ''):
            continue
        digest = re.search(r'^TERMUX_PKG_SHA256=([0-9a-f]{64})', recipe, re.M)[1]
        if package == 'git':
            source = f'git-{upstream[1]}.tar.xz'
            download(f'https://mirrors.kernel.org/pub/software/scm/git/{source}', licenses / source, digest)
        else:
            main_version, patch_number = upstream[1].rsplit('.', 1)
            source = f'{package}-{main_version}.tar.gz'
            root = f'https://mirrors.kernel.org/gnu/{package}'
            download(f'{root}/{source}', licenses / source, digest)
            patch_prefix = f'{package}{main_version.replace(".", "")}'
            checksums = dict(re.findall(r'PATCH_CHECKSUMS\[(\d{3})\]=([0-9a-f]{64})', recipe))
            def patch_source(number):
                index = f'{number:03d}'
                filename = f'{patch_prefix}-{index}'
                download(f'{root}/{package}-{main_version}-patches/{filename}', licenses / filename, checksums[index])
            with ThreadPoolExecutor(max_workers=8) as pool:
                list(pool.map(patch_source, range(1, int(patch_number) + 1)))
        files = json.loads(download(f'{TERMUX_API}/contents/{recipe_path}?ref={ref}',
                                    work / f'{package}-recipe-files.json').read_text())
        for file in files:
            if file['type'] == 'file' and file['name'].endswith('.patch'):
                download(file['download_url'], licenses / f'{package}-{file["name"]}')
        (licenses / f'{package}-termux-source.txt').write_text(f'https://github.com/termux/termux-packages/tree/{ref}/{recipe_path}\n')
        return
    raise ValueError(f'Could not find the corresponding Termux build recipe for {package} {version}.')


def main():
    work, native, assets = map(Path, sys.argv[1:4])
    arch = sys.argv[4]
    work.mkdir(parents=True, exist_ok=True)
    selected = download_packages(work, repository_index(work, arch))
    source = work / 'packages' / PREFIX
    dependencies = pack_libraries(source, native, arch)
    (assets / 'libraries.txt').write_text(''.join(f'{name} {file}\n' for name, file in sorted(dependencies.items())))
    shutil.copyfile(source / 'etc/tls/cert.pem', assets / 'cert.pem')
    # The supplied templates include hook samples only. Git creates the real hook
    # directory in the working tree. Do not install desktop script dependencies.
    (assets / 'git-templates').mkdir()
    (assets / 'git-templates' / 'description').write_text('Promptbook Android project\n')
    licenses = assets / 'licenses'
    licenses.mkdir()
    versions = []
    for name, fields in sorted(selected.items()):
        license_dir = source / 'share/doc' / name
        if license_dir.is_dir():
            shutil.copytree(license_dir, licenses / name, ignore_dangling_symlinks=True)
        versions.append(f"{name} {fields['Version']} {TERMUX}/{fields['Filename']} {fields['SHA256']}")
    (licenses / 'termux-packages.txt').write_text('\n'.join(versions) + '\n')
    for package in ('git', 'bash', 'readline'):
        include_source(work, licenses, package, selected[package]['Version'].split(':')[-1])


if __name__ == '__main__':
    main()
