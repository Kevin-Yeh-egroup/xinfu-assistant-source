"""Combine rendered video + soundtrack into the final MP4 (loudness -16 LUFS, AAC 192k)."""
import re, subprocess, sys
name = sys.argv[1]
title = {'guide': '創業貸款準備助手-教學影片-引導員篇', 'reviewer': '創業貸款準備助手-教學影片-審查人員篇', 'partner': '創業貸款準備助手-教學影片-夥伴修改篇'}[name]
wav, vid = f'out/{name}-audio.wav', f'out/{name}.mp4'
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True)
I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r.stderr)[-1])
gain = -16.0 - I
out = f'out/{name}-hq.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', vid, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
                '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=disabled', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                '-shortest', '-movflags', '+faststart', '-metadata', f'title={title}',
                '-metadata', 'comment=信扶專案 創業貸款準備助手 操作教學（畫面中的個案皆為虛構示範資料）', out], check=True)
print(f'{out}  (measured {I:.1f} LUFS, gain {gain:+.2f} dB)')
