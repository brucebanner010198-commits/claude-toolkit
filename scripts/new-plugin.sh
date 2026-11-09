#!/usr/bin/env bash
# Usage: new-plugin.sh <theme-kebab-name> "<description>"
set -eu
cd "$(dirname "$0")/.."
name=${1:?theme name}; desc=${2:?description}
[[ $name =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "name must be kebab-case"; exit 1; }
[ ! -e "plugins/$name" ] || { echo "plugins/$name exists"; exit 1; }
mkdir -p "plugins/$name/.claude-plugin" "plugins/$name/skills" "plugins/$name/agents"
cat > "plugins/$name/.claude-plugin/plugin.json" <<JSON
{
  "name": "$name",
  "version": "0.1.0",
  "description": "$desc",
  "author": { "name": "brucebanner010198-commits" }
}
JSON
python3 - "$name" "$desc" <<'PY'
import json, sys
n, d = sys.argv[1], sys.argv[2]
p = '.claude-plugin/marketplace.json'
m = json.load(open(p))
m['plugins'].append({'name': n, 'source': './plugins/' + n, 'description': d, 'version': '0.1.0'})
json.dump(m, open(p, 'w'), indent=2); open(p, 'a').write('\n')
PY
printf '\n## %s 0.1.0\n- Initial plugin.\n' "$name" >> CHANGELOG.md
echo "Created plugins/$name and listed it in the marketplace."
