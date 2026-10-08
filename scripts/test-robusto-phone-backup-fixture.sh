#!/usr/bin/env bash
# Exercises only a public dummy fixture; no wallet/key files or phone are accessed.
set -euo pipefail

for cmd in gpg gpgconf openssl sha256sum cmp python3; do
  command -v "$cmd" >/dev/null 2>&1 || { printf 'BLOCK missing required test tool: %s\n' "$cmd"; exit 1; }
done

tmp="$(mktemp -d "${TMPDIR:-/tmp}/robusto-phone-fixture.XXXXXX")"
chmod 700 "$tmp"
mkdir -m 700 "$tmp/gnupg" "$tmp/phone-storage-simulation" "$tmp/recovered"
chmod 700 "$tmp/gnupg"
cleanup() {
  gpgconf --homedir "$tmp/gnupg" --kill gpg-agent >/dev/null 2>&1 || true
  rm -rf -- "$tmp"
}
trap cleanup EXIT
trap 'exit 130' HUP INT TERM

printf 'ROBUSTO PUBLIC TEST FIXTURE ONLY\nNo wallet or production secret.\n' > "$tmp/fixture.txt"
openssl rand -hex 32 > "$tmp/test-passphrase"
chmod 600 "$tmp/fixture.txt" "$tmp/test-passphrase"

if ! gpg --quiet --batch --no-tty --pinentry-mode loopback \
  --homedir "$tmp/gnupg" --passphrase-fd 0 \
  --no-symkey-cache --symmetric --cipher-algo AES256 --compress-algo none \
  --output "$tmp/laptop-copy.gpg" "$tmp/fixture.txt" \
  < "$tmp/test-passphrase" 2> "$tmp/encrypt.log"; then
  printf 'FAIL dummy encryption step\n'
  cat "$tmp/encrypt.log"
  exit 1
fi

# Compatibility target is standard OpenPGP CFB+MDC: it detects modifications,
# while avoiding optional OCB/AEAD packets not consistently supported by Android clients.
gpg --list-packets "$tmp/laptop-copy.gpg" > "$tmp/packet-list.log" 2>&1 || true
if ! grep -q 'mdc_method: 2' "$tmp/packet-list.log"; then
  printf 'FAIL expected OpenPGP MDC integrity packet\n'
  cat "$tmp/packet-list.log"
  exit 1
fi

# Simulate the encrypted-file handoff only; this is not a physical S22/MTP test.
cp -- "$tmp/laptop-copy.gpg" "$tmp/phone-storage-simulation/ROBUSTO_TEST_ONLY.gpg"
sha256sum "$tmp/laptop-copy.gpg" | cut -d ' ' -f 1 > "$tmp/hash-source"
sha256sum "$tmp/phone-storage-simulation/ROBUSTO_TEST_ONLY.gpg" | cut -d ' ' -f 1 > "$tmp/hash-copy"
cmp -s "$tmp/hash-source" "$tmp/hash-copy"

gpg --quiet --batch --no-tty --pinentry-mode loopback \
  --homedir "$tmp/gnupg" --passphrase-fd 0 \
  --no-symkey-cache --output "$tmp/recovered/fixture.txt" \
  --decrypt "$tmp/phone-storage-simulation/ROBUSTO_TEST_ONLY.gpg" \
  < "$tmp/test-passphrase" 2> "$tmp/decrypt.log"
cmp -s "$tmp/fixture.txt" "$tmp/recovered/fixture.txt"

# A corrupted ciphertext must fail integrity verification and is discarded.
python3 - "$tmp/phone-storage-simulation/ROBUSTO_TEST_ONLY.gpg" "$tmp/corrupt.gpg" <<'PY'
import pathlib
import sys

source, target = map(pathlib.Path, sys.argv[1:])
data = bytearray(source.read_bytes())
if len(data) < 32:
    raise SystemExit("fixture ciphertext unexpectedly short")
data[-8] ^= 0x01
target.write_bytes(data)
PY
if gpg --quiet --batch --no-tty --pinentry-mode loopback \
  --homedir "$tmp/gnupg" --passphrase-fd 0 \
  --no-symkey-cache --output "$tmp/recovered/corrupt-output" \
  --decrypt "$tmp/corrupt.gpg" < "$tmp/test-passphrase" 2> "$tmp/corrupt.log"; then
  printf 'FAIL tampered ciphertext was accepted\n'
  exit 1
fi
rm -f -- "$tmp/recovered/corrupt-output"

printf 'PASS dummy OpenPGP AES-256 + MDC format, copy hash, decrypt/restore, and tamper rejection\n'
printf 'LIMIT no Samsung device, Android app, MTP link, or damaged-screen recovery was exercised\n'
