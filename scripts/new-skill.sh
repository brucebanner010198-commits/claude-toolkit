#!/usr/bin/env bash
# Usage: new-skill.sh <theme> <skill-kebab-name> "<description>"
set -eu
cd "$(dirname "$0")/.."
theme=${1:?theme}; name=${2:?skill name}; desc=${3:?description}
[ -d "plugins/$theme" ] || { echo "no plugin $theme (run new-plugin.sh first)"; exit 1; }
[[ $name =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "name must be kebab-case"; exit 1; }
d="plugins/$theme/skills/$name"
[ ! -e "$d" ] || { echo "$d exists"; exit 1; }
mkdir -p "$d"
printf -- '---\nname: %s\ndescription: %s\n---\n\n# %s\n\nTODO: write the skill.\n' "$name" "$desc" "$name" > "$d/SKILL.md"
printf '| %s | %s | model | %s |\n' "$theme" "$name" "$desc" >> README.md.rows
echo "Created $d. Move the row from README.md.rows into the README table, bump the plugin version, add a CHANGELOG line, then run scripts/check.sh."
