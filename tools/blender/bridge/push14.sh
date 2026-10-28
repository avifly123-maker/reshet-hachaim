#!/bin/bash
# 1.4: copy kit/spec files to a fresh staged name (the device tool caches by staged name) and print the JSON list for
# device_commit_files, aimed at Documents\reshet-hachaim-1.4\animals on the owner's PC.
cd "$(dirname "$0")/.."; ts=$(date +%s%N | cut -c1-13); out=/mnt/user-data/outputs/ak; mkdir -p $out; first=1; echo -n '['
for f in "$@"; do
  src=$f; [ -f "$src" ] || src=animals/$f.py; b=$(basename $src .py); cp $src $out/${b}_$ts.py
  [ $first = 1 ] || echo -n ','; first=0
  echo -n "{\"stagedPath\":\"$out/${b}_$ts.py\",\"devicePath\":\"~/Documents/reshet-hachaim-1.4/animals/$b.py\"}"
done; echo ']'
