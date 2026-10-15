#!/bin/bash
# copy kit/spec files to a fresh staged name; prints JSON for device_commit_files
cd /home/claude/game/tools/blender; ts=$(date +%s); out=/mnt/user-data/outputs/ak; mkdir -p $out; first=1; echo -n '['
for f in "$@"; do
  src=$f; [ -f "$src" ] || src=animals/$f.py; b=$(basename $src .py); cp $src $out/${b}_$ts.py
  [ $first = 1 ] || echo -n ','; first=0
  echo -n "{\"stagedPath\":\"$out/${b}_$ts.py\",\"devicePath\":\"C:\\\\Users\\\\avifl\\\\Documents\\\\reshet-hachaim-blender\\\\animals\\\\$b.py\"}"
done; echo ']'
