#!/bin/bash
# Web/delivery copy of a finished video: 1080p H.264 two-pass sized for <= ~24 MB
# (GitHub web upload limit is 25 MB per file), AAC 128k, faststart.
# usage: bash compress.sh <in.mp4> <out.mp4> [target_MB]
set -euo pipefail
IN="$1"; OUT="$2"; MB="${3:-23.5}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
TOTAL=$(python3 -c "print(int($MB*8*1024*1024/$DUR/1000))")   # kbps
VB=$((TOTAL - 128 - 12))
TMP=$(mktemp -d)
nice -n 5 ffmpeg -y -v error -i "$IN" -c:v libx264 -preset slow -b:v ${VB}k -maxrate $((VB*2))k -bufsize $((VB*4))k \
  -pix_fmt yuv420p -profile:v high -g 60 -pass 1 -passlogfile "$TMP/p" -an -f null /dev/null
nice -n 5 ffmpeg -y -v error -i "$IN" -map 0:v:0 -map 0:a:0 -c:v libx264 -preset slow -b:v ${VB}k -maxrate $((VB*2))k -bufsize $((VB*4))k \
  -pix_fmt yuv420p -profile:v high -g 60 -pass 2 -passlogfile "$TMP/p" -c:a aac -b:a 128k -ar 48000 \
  -movflags +faststart -map_metadata 0 "$OUT"
rm -rf "$TMP"
echo "$OUT $(stat -c %s "$OUT") bytes, video ${VB}k, dur ${DUR}s"
