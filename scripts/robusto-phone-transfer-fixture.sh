#!/usr/bin/env bash
# Public, non-secret fixture for a manual laptop <-> Samsung USB transfer test.
set -euo pipefail
umask 077

usage() {
  printf 'Usage: %s create <local-test-directory> | verify <returned.gpg> <expected-sha256> | self-test\n' "$0" >&2
  exit 2
}

for cmd in gpg gpgconf sha256sum cmp; do
  command -v "$cmd" >/dev/null 2>&1 || { printf 'BLOCK missing required tool: %s\n' "$cmd" >&2; exit 1; }
done

# This phrase is intentionally public and weak. It is ONLY for dummy data and
# must never be reused for any wallet backup.
fixture_passphrase='ROBUSTO-S22-PUBLIC-FIXTURE-ONLY'
fixture_text='ROBUSTO PUBLIC S22 TRANSFER FIXTURE ONLY; contains no key material.'

work="$(mktemp -d "${TMPDIR:-/tmp}/robusto-s22-fixture.XXXXXX")"
chmod 700 "$work"
mkdir -m 700 "$work/gnupg" "$work/recovered"
cleanup() {
  gpgconf --homedir "$work/gnupg" --kill gpg-agent >/dev/null 2>&1 || true
  rm -rf -- "$work"
}
trap cleanup EXIT
trap 'exit 130' HUP INT TERM

encrypt_fixture() {
  local plain="$1" cipher="$2"
  printf '%s\n' "$fixture_text" > "$plain"
  printf '%s' "$fixture_passphrase" | gpg --quiet --batch --no-tty --pinentry-mode loopback \
    --homedir "$work/gnupg" --passphrase-fd 0 --no-symkey-cache \
    --symmetric --cipher-algo AES256 --compress-algo none --output "$cipher" "$plain" 2>/dev/null
}

verify_fixture() {
  local cipher="$1" expected="$2" actual
  [[ "$expected" =~ ^[[:xdigit:]]{64}$ ]] || { printf 'BLOCK expected SHA-256 must be 64 hex digits\n' >&2; return 1; }
  actual="$(sha256sum -- "$cipher" | cut -d ' ' -f 1)"
  [[ "${actual,,}" == "${expected,,}" ]] || { printf 'FAIL ciphertext hash mismatch\n' >&2; return 1; }
  printf '%s' "$fixture_passphrase" | gpg --quiet --batch --no-tty --pinentry-mode loopback \
    --homedir "$work/gnupg" --passphrase-fd 0 --no-symkey-cache \
    --output "$work/recovered/fixture.txt" --decrypt "$cipher" 2>/dev/null
  printf '%s\n' "$fixture_text" > "$work/expected.txt"
  cmp -s "$work/expected.txt" "$work/recovered/fixture.txt" || { printf 'FAIL decrypted fixture mismatch\n' >&2; return 1; }
  printf 'PASS returned ciphertext hash and dummy decrypt/restore\n'
}

case "${1:-}" in
  create)
    [[ $# -eq 2 ]] || usage
    destination="$2"
    [[ "$destination" = /* ]] || { printf 'BLOCK use an absolute local path\n' >&2; exit 1; }
    [[ ! -e "$destination" ]] || { printf 'BLOCK choose a new, non-existing local test directory\n' >&2; exit 1; }
    mkdir -m 700 -- "$destination"
    cipher="$destination/ROBUSTO_S22_TEST_ONLY.gpg"
    manifest="$destination/ROBUSTO_S22_TEST_ONLY.sha256"
    chmod 700 "$destination"
    encrypt_fixture "$work/plain.txt" "$cipher"
    chmod 600 "$cipher"
    sha256sum -- "$cipher" > "$manifest"
    chmod 600 "$manifest"
    printf 'FIXTURE_ONLY ciphertext=%s\n' "$cipher"
    printf 'FIXTURE_ONLY manifest=%s\n' "$manifest"
    printf 'FIXTURE_ONLY sha256=%s\n' "$(sha256sum -- "$cipher" | cut -d ' ' -f 1)"
    printf 'LIMIT public dummy phrase is embedded for this fixture; never use it for wallets\n'
    ;;
  verify)
    [[ $# -eq 3 ]] || usage
    verify_fixture "$2" "$3"
    ;;
  self-test)
    [[ $# -eq 1 ]] || usage
    encrypt_fixture "$work/plain.txt" "$work/roundtrip.gpg"
    expected="$(sha256sum -- "$work/roundtrip.gpg" | cut -d ' ' -f 1)"
    cp -- "$work/roundtrip.gpg" "$work/copied-back.gpg"
    verify_fixture "$work/copied-back.gpg" "$expected"
    printf 'LIMIT simulated file copy only; no physical phone/MTP operation was performed\n'
    ;;
  *) usage ;;
esac
