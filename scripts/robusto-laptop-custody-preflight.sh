#!/usr/bin/env bash
# Read-only audit of laptop/WSL readiness for a future offline custody ceremony.
# This script never reads wallet/key files, never creates secrets, and never contacts RPC.
set -u

failures=0
warnings=0

pass() { printf 'PASS %s\n' "$1"; }
block() { printf 'BLOCK %s\n' "$1"; failures=$((failures + 1)); }
unknown() { printf 'UNKNOWN %s\n' "$1"; warnings=$((warnings + 1)); }

if grep -qi microsoft /proc/sys/kernel/osrelease 2>/dev/null; then
  pass 'running inside WSL'
else
  block 'not running inside WSL; this laptop-specific checklist needs review'
fi

if grep -qi 'microsoft-standard-wsl2' /proc/sys/kernel/osrelease 2>/dev/null; then
  pass 'WSL2 kernel detected'
else
  block 'WSL2 not detected'
fi

uid="$(id -u)"
if [ "$uid" -ne 0 ]; then pass 'current user is unprivileged'; else block 'do not run this preflight or future key generation as root'; fi

umask_value="$(umask)"
case "$umask_value" in
  0077|077) pass 'umask is 077' ;;
  *) block 'umask is not 077; future private files would need stricter defaults' ;;
esac

if swap_lines="$(swapon --noheadings 2>/dev/null)"; then
  if [ -z "$swap_lines" ]; then pass 'Linux swap is inactive'; else block 'Linux swap is active; WSL swap must be disabled and verified before any secret generation'; fi
else
  block 'Linux swap status could not be verified'
fi

ram_dir="${ROBUSTO_RAM_DIR:-/mnt/robusto-ram}"
if [ ! -d "$ram_dir" ]; then
  block 'dedicated RAM directory is absent; expected /mnt/robusto-ram (or ROBUSTO_RAM_DIR override)'
else
  fs="$(findmnt -T "$ram_dir" -n -o FSTYPE 2>/dev/null)" || fs=''
  opts="$(findmnt -T "$ram_dir" -n -o OPTIONS 2>/dev/null)" || opts=''
  mode="$(stat -c '%a' "$ram_dir" 2>/dev/null || true)"
  owner="$(stat -c '%u' "$ram_dir" 2>/dev/null || true)"
  if [ "$fs" != tmpfs ]; then block 'dedicated RAM directory is not on tmpfs'; else pass 'dedicated RAM directory is on tmpfs'; fi
  case ",$opts," in
    *,ro,*) block 'dedicated RAM filesystem is read-only';;
    *,rw,*)
      if [ "$fs" = tmpfs ]; then pass 'dedicated tmpfs mount reports rw; actual write access still requires owner verification'; fi ;;
    *) block 'dedicated RAM filesystem rw/ro mount status could not be verified';;
  esac
  for opt in nosuid nodev noexec; do
    case ",$opts," in *,$opt,*) pass "tmpfs has $opt";; *) block "tmpfs is missing mount option $opt";; esac
  done
  if [ "$mode" = 700 ] && [ "$owner" = "$uid" ]; then pass 'RAM directory is owned by the current user with mode 0700'; else block 'RAM directory must be owned by current user with mode 0700'; fi
fi

avail_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
if [ "${avail_kb:-0}" -gt 1048576 ] 2>/dev/null; then pass 'more than 1 GiB currently available in guest RAM'; else block 'less than 1 GiB currently available in guest RAM'; fi

if routes="$(awk 'NR>1 && $2=="00000000" {n++} END {print n+0}' /proc/net/route 2>/dev/null)" && [[ "$routes" =~ ^[0-9]+$ ]]; then
  if [ "$routes" -eq 0 ]; then pass 'no Linux default IPv4 route currently visible'; else block 'Linux default IPv4 route exists; this is not an offline ceremony environment'; fi
else
  block 'Linux default IPv4 route status could not be verified'
fi
if routes6="$(awk '$1=="00000000000000000000000000000000" && $2=="00" && $10!="lo" {n++} END {print n+0}' /proc/net/ipv6_route 2>/dev/null)" && [[ "$routes6" =~ ^[0-9]+$ ]]; then
  if [ "$routes6" -eq 0 ]; then pass 'no Linux default IPv6 route currently visible'; else block 'Linux default IPv6 route exists; this is not an offline ceremony environment'; fi
else
  block 'Linux default IPv6 route status could not be verified'
fi
unknown 'guest route status cannot prove Windows Wi-Fi/Ethernet is physically disconnected'
unknown 'Windows host pagefile, hibernation, BitLocker, telemetry, WSL networking config, and cloud sync are not verifiable from this guest audit'
unknown 'interactive shell history and terminal recording are not verifiable from this non-interactive audit'

case "$-" in *x*) block 'shell xtrace is enabled';; *) pass 'shell xtrace is disabled in this process';; esac
case "$-" in *i*) unknown 'interactive shell history policy requires manual check';; *) pass 'this audit process is non-interactive; this does not attest the owner terminal history policy';; esac

for cmd in solana-keygen gpg openssl findmnt swapon; do
  if command -v "$cmd" >/dev/null 2>&1; then pass "$cmd is installed"; else block "$cmd is missing"; fi
done
if command -v cryptsetup >/dev/null 2>&1; then pass 'cryptsetup is installed'; else unknown 'cryptsetup/LUKS tooling is absent; encrypted GPG backups are still possible, but removable media workflow must be reviewed'; fi

repo_path="$(pwd -P 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr '\\' '/')"
case "$repo_path" in *onedrive*|*dropbox*|*google\ drive*|*icloud*) block 'current directory path appears to be under a named sync folder';; *) pass 'current Linux path has no known cloud-sync folder name';; esac
unknown 'Windows-side sync configuration and WSL virtual-disk host location need owner verification'

printf 'SUMMARY blocks=%s unknowns=%s\n' "$failures" "$warnings"
printf 'SAFETY this script inspected no wallet/key files, public key inventory, shell history contents, or RPC endpoints\n'
[ "$failures" -eq 0 ]
