#!/usr/bin/env bash
# Validates the marketplace. Exit 1 on any problem.
set -u
cd "$(dirname "$0")/.."
fail=0
err() { echo "FAIL: $*"; fail=1; }

command -v python3 >/dev/null || { echo "python3 required"; exit 1; }

# JSON manifests parse
for f in .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json; do
  python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$f" 2>/dev/null || err "invalid JSON: $f"
done

# Every plugin dir is listed in the marketplace with a matching version
python3 - <<'PY' || fail=1
import json, glob, os, sys
ok = True
m = json.load(open('.claude-plugin/marketplace.json'))
listed = {p['name']: p for p in m['plugins']}
for d in sorted(glob.glob('plugins/*/')):
    name = os.path.basename(d.rstrip('/'))
    pj = json.load(open(d + '.claude-plugin/plugin.json'))
    if pj['name'] != name:
        print('FAIL: plugin.json name %s != folder %s' % (pj['name'], name)); ok = False
    if name not in listed:
        print('FAIL: plugin %s missing from marketplace.json' % name); ok = False
    elif listed[name].get('version') != pj.get('version'):
        print('FAIL: version mismatch for %s' % name); ok = False
for n in listed:
    if not os.path.isdir('plugins/' + n):
        print('FAIL: marketplace lists missing plugin %s' % n); ok = False
sys.exit(0 if ok else 1)
PY

# Skills: frontmatter name == folder, description present, README row present
for s in plugins/*/skills/*/; do
  n=$(basename "$s")
  [ -f "$s/SKILL.md" ] || { err "no SKILL.md in $s"; continue; }
  fm=$(sed -n '2p' "$s/SKILL.md")
  [ "$fm" = "name: $n" ] || err "$s/SKILL.md line 2 must be 'name: $n'"
  grep -q '^description: ' "$s/SKILL.md" || err "$s/SKILL.md missing description"
  grep -q "| $n |" README.md || err "README table missing skill $n"
done

# Agents: frontmatter name == file name
for a in plugins/*/agents/*.md; do
  n=$(basename "$a" .md)
  grep -q "^name: $n\$" "$a" || err "$a name mismatch"
done

# ASCII-only scan (portable: no grep -P)
python3 - <<'PYEOF' || fail=1
import os, sys
bad = []
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d != '.git']
    for f in files:
        path = os.path.join(root, f)
        try:
            data = open(path, 'rb').read()
        except OSError:
            continue
        if b'\0' in data:
            continue
        if any(c > 127 for c in data):
            bad.append(path)
for p in bad:
    print('FAIL: non-ASCII in ' + p)
sys.exit(1 if bad else 0)
PYEOF

# Secret grep
if grep -rInE --exclude-dir=.git --exclude=check.sh 'gh[opsu]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY' . ; then
  err "possible secret found"
fi

[ $fail -eq 0 ] && echo "check: OK" || { echo "check: FAILED"; exit 1; }
