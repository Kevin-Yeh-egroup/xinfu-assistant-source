"""Original soundtrack for the tutorial videos: felt-piano arpeggios, soft pad, warm bass,
sparse bell melody, plus gentle UI sound effects placed from the storyboard events.
usage: python3 music.py <guide|reviewer|partner>   -> out/<name>-audio.wav (48 kHz stereo float)"""
import json, sys, math
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import wave, struct

SR = 48000
NAME = sys.argv[1]
EV = json.load(open(f'out/{NAME}-events.json', encoding='utf8'))
DUR = EV['dur']
rng = np.random.default_rng({'guide': 20261009, 'reviewer': 20261010}.get(NAME, 20261012))

def mfreq(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    na = min(na, n); nr = min(nr, n)
    e[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    e[-nr:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nr))
    return e

def felt_piano(m, dur, vel):
    f = mfreq(m)
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00015
    for k in range(1, 9):
        fk = k * f * math.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        amp = 1.0 / (k ** 1.55) * (vel ** (0.25 * (k - 1)))
        tau_long = 2.6 * (261.6 / f) ** 0.35 / (1 + 0.45 * (k - 1))
        tau_short = 0.28 / math.sqrt(k)
        env = 0.5 * np.exp(-t / tau_short) + 0.5 * np.exp(-t / tau_long)
        out += amp * env * np.sin(2 * np.pi * fk * t + 0.3 * k)
    # soft hammer: tiny low-passed noise click
    nn = int(0.012 * SR)
    hn = rng.standard_normal(nn) * np.exp(-np.arange(nn) / (0.003 * SR))
    hn = sosfilt(butter(2, 1800, 'low', fs=SR, output='sos'), hn)
    out[:nn] += 0.025 * hn
    out *= env_adsr(n, 0.004, 0.25)
    return out * vel

def pad_note(m, dur, amp=1.0):
    f = mfreq(m)
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for c in (-6, 0, 5):
        fc = f * 2 ** (c / 1200)
        out += np.sin(2 * np.pi * fc * t + rng.uniform(0, 6.28))
    out += 0.18 * np.sin(2 * np.pi * 2 * f * t)
    out *= (1 + 0.08 * np.sin(2 * np.pi * 0.23 * t + rng.uniform(0, 6.28)))
    out *= env_adsr(n, min(1.6, dur * 0.45), min(2.0, dur * 0.5))
    return out * amp / 3.2

def bass_note(m, dur, vel=0.8):
    f = mfreq(m)
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * f * t) + 0.32 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    out *= np.exp(-t / 1.9) * env_adsr(n, 0.02, 0.3)
    return out * vel

def bell(m, dur, vel=0.6):
    f = mfreq(m)
    n = int(SR * dur)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, a, tau in ((1, 1, 1.6), (2.0, 0.28, 0.9), (3.01, 0.12, 0.5), (4.16, 0.06, 0.3)):
        out += a * np.exp(-t / tau) * np.sin(2 * np.pi * f * ratio * t)
    out *= env_adsr(n, 0.003, 0.4)
    return out * vel

def place(buf, sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= buf.shape[1] or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    j = min(buf.shape[1], i + len(sig))
    s = sig[:j - i] * gain
    l = math.cos((pan + 1) * math.pi / 4); r = math.sin((pan + 1) * math.pi / 4)
    buf[0, i:j] += s * l * 1.414
    buf[1, i:j] += s * r * 1.414

# ---------------- harmony ----------------
if NAME == 'guide':
    BARS = [  # (bass, arpeggio tones, pad tones, melody top note)
        (41, [53, 60, 64, 69, 72], [53, 57, 60, 64], 81),   # Fmaj7
        (40, [55, 60, 64, 67, 72], [52, 55, 60, 64], 79),   # C/E
        (38, [57, 60, 65, 69, 74], [50, 57, 60, 65], 77),   # Dm7
        (34, [58, 62, 65, 69, 74], [50, 53, 57, 62], 77),   # Bbmaj7
        (45, [53, 60, 64, 69, 72], [53, 57, 60, 64], 76),   # F/A
        (43, [58, 62, 65, 67, 70], [50, 55, 58, 62], 74),   # Gm7
        (46, [58, 62, 65, 69, 74], [50, 53, 57, 62], 74),   # Bbmaj7
        (36, [55, 60, 65, 67, 72], [48, 55, 60, 65], 72),   # Csus4 -> C
    ]
    TONIC = (41, [53, 60, 64, 67, 69, 72, 76], [53, 57, 60, 64, 67])
    BPM = 74
elif NAME == 'partner':  # G major, a little slower and softer
    BARS = [
        (43, [55, 62, 66, 71, 74], [55, 59, 62, 66], 79),   # Gmaj7
        (42, [54, 57, 62, 66, 69], [54, 57, 62, 66], 78),   # D/F#
        (40, [55, 59, 64, 67, 71], [52, 55, 59, 62], 76),   # Em7
        (36, [55, 59, 64, 67, 71], [48, 55, 59, 64], 74),   # Cmaj7
        (47, [55, 59, 62, 67, 71], [55, 59, 62, 67], 74),   # G/B
        (45, [57, 60, 64, 67, 72], [52, 55, 60, 64], 72),   # Am7
        (36, [55, 60, 62, 67, 72], [48, 55, 60, 62], 76),   # Cadd9
        (38, [57, 62, 67, 69, 74], [50, 57, 62, 67], 74),   # Dsus4 -> D
    ]
    TONIC = (43, [55, 59, 62, 66, 67, 71, 74], [55, 59, 62, 66, 69])
    BPM = 66
else:
    BARS = [
        (38, [57, 62, 66, 69, 73], [50, 54, 57, 61], 78),   # Dmaj7
        (37, [57, 61, 64, 69, 73], [49, 52, 57, 61], 76),   # A/C#
        (35, [57, 62, 66, 69, 74], [47, 54, 57, 62], 74),   # Bm7
        (43, [59, 62, 66, 71, 74], [47, 50, 54, 59], 74),   # Gmaj7
        (40, [59, 62, 67, 71, 74], [52, 55, 59, 62], 71),   # Em7
        (45, [57, 61, 64, 69, 73], [49, 52, 57, 61], 73),   # A
        (42, [57, 61, 66, 69, 73], [49, 54, 57, 61], 69),   # F#m7
        (43, [59, 62, 66, 71, 74], [47, 50, 54, 59], 71),   # Gmaj7
    ]
    TONIC = (38, [57, 62, 66, 69, 71, 74, 78], [50, 54, 57, 61, 64])
    BPM = 70

shots = EV['shots']
end_start = [s for s in shots if s['type'] == 'end'][-1]['t0']
bar_guess = 240.0 / BPM
NB = max(8, round(end_start / bar_guess))
BAR = end_start / NB            # bars land exactly on the end card
BEAT = BAR / 4
print(f'{NAME}: dur {DUR:.2f}s  bars {NB}  bar {BAR:.3f}s  bpm {240 / BAR:.1f}')

N = int(SR * (DUR + 4))
dry = np.zeros((2, N)); wet_send = np.zeros((2, N)); pad = np.zeros((2, N))
PAT_A = [0, 1, 2, 3, 4, 3, 2, 1]
PAT_B = [0, 2, 1, 3, 2, 4, 3, 1]

for b in range(NB):
    t0 = b * BAR
    bass, arp, padn, top = BARS[b % len(BARS)]
    arp = [m + 12 for m in arp]
    sec = 'intro' if b < 2 else ('B' if (NB * 0.38) <= b < (NB * 0.75) else 'A')
    # pad
    for m in padn:
        place(pad, pad_note(m, BAR + 1.2, 0.55 if sec != 'intro' else 0.7), t0 - 0.15, pan=rng.uniform(-0.3, 0.3))
    # bass
    if sec != 'intro':
        place(dry, bass_note(bass, BAR * 0.98, 0.42), t0 + 0.01, pan=0)
        place(dry, bass_note(bass + 12, BAR * 0.45, 0.16), t0 + 2 * BEAT, pan=0)
    # piano
    if sec == 'intro':
        for i, idx in enumerate([0, 2, 4, 3]):
            m = arp[idx]
            place(dry, felt_piano(m, 3.4, 0.5 + 0.05 * (i == 0)), t0 + i * BEAT + rng.uniform(-0.006, 0.006), pan=(m - 64) / 30)
    else:
        pat = PAT_A if (b // 4) % 2 == 0 else PAT_B
        last = (b % 8 == 7)
        for i, idx in enumerate(pat):
            m = arp[idx]
            if last and i >= 4 and NAME == 'guide':  # sus4 resolves to the 3rd
                m = 76 if m == 77 else m
            if last and i >= 4 and NAME == 'partner':
                m = 78 if m == 79 else m
            vel = (0.62 if i % 4 == 0 else 0.5 if i % 2 == 0 else 0.42) + rng.uniform(-0.04, 0.04)
            place(dry, felt_piano(m, 2.6, vel), t0 + i * BEAT / 2 + rng.uniform(-0.006, 0.006), pan=(m - 64) / 28)
    # bell melody in section B
    if sec == 'B':
        second = arp[3] if arp[3] != top else arp[2]
        for k, (eighth, m) in enumerate(((0, top), (4, second))):
            if NAME == 'reviewer' and k == 1:
                eighth = 6
            place(wet_send, bell(m, 2.6, 0.15 if k == 0 else 0.11), t0 + eighth * BEAT / 2 + rng.uniform(-0.004, 0.004), pan=0.25 if k == 0 else -0.2)

# ending: tonic chord rolled slowly, long tail
bass, arp, padn = TONIC
arp = [m + 12 for m in arp]
for m in padn:
    place(pad, pad_note(m, DUR - end_start + 3.5, 0.62), end_start - 0.2, pan=rng.uniform(-0.3, 0.3))
place(dry, bass_note(bass, 6.0, 0.5), end_start)
for i, m in enumerate(arp):
    place(dry, felt_piano(m, 5.0, 0.5 - i * 0.03), end_start + i * BEAT * 0.75, pan=(m - 64) / 28)
for i, m in enumerate(arp[::-1][:4]):
    place(dry, felt_piano(m, 4.5, 0.34), end_start + 4 * BAR / 4 + 1.6 + i * BEAT, pan=(m - 64) / 28)

# ---------------- reverb ----------------
def impulse(rt60=2.6, length=3.2, seed=7):
    r = np.random.default_rng(seed)
    n = int(SR * length)
    t = np.arange(n) / SR
    tau = rt60 / 6.9
    ir = np.zeros((2, n))
    lp = butter(2, 5200, 'low', fs=SR, output='sos')
    for ch in range(2):
        noise = r.standard_normal(n)
        noise = sosfilt(lp, noise)
        ir[ch] = noise * np.exp(-t / tau)
        pre = int(0.018 * SR)
        ir[ch] = np.concatenate([np.zeros(pre), ir[ch][:-pre]])
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    return ir

IR = impulse()
music_dry = dry + 0.42 * pad
send = 0.30 * dry + 0.5 * pad + wet_send
rev = np.stack([fftconvolve(send[c], IR[c])[:N] for c in range(2)])
music = 0.85 * music_dry + 0.55 * rev + 0.35 * wet_send
# gentle tone shaping: tame lows below 45 Hz and harsh highs
music = sosfilt(butter(2, 40, 'high', fs=SR, output='sos'), music)
music = sosfilt(butter(2, 11000, 'low', fs=SR, output='sos'), music)
# fades
fi = int(1.5 * SR); music[:, :fi] *= np.linspace(0, 1, fi) ** 2
end_n = int(DUR * SR); fo = int(4.5 * SR)
music[:, end_n - fo:end_n] *= np.linspace(1, 0, fo) ** 1.6
music[:, end_n:] = 0
music /= np.max(np.abs(music)) + 1e-9
music *= 0.42

# ---------------- sound effects ----------------
def noise(n):
    return rng.standard_normal(n)

def sfx(name, soft=False):
    if name == 'click':
        n = int(0.05 * SR); t = np.arange(n) / SR
        s = 0.6 * np.sin(2 * np.pi * 1750 * t) * np.exp(-t / 0.008) + 0.5 * sosfilt(butter(2, [1500, 5000], 'band', fs=SR, output='sos'), noise(n)) * np.exp(-t / 0.004)
        return s * 0.16
    if name == 'key':
        n = int(0.035 * SR); t = np.arange(n) / SR
        s = sosfilt(butter(2, [1200, 4200], 'band', fs=SR, output='sos'), noise(n)) * np.exp(-t / 0.005) + 0.3 * np.sin(2 * np.pi * rng.uniform(900, 1300) * t) * np.exp(-t / 0.006)
        return s * 0.07
    if name == 'pop':
        n = int(0.12 * SR); t = np.arange(n) / SR
        f = 520 + 420 * (t / t[-1])
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.035)
        return s * 0.11
    if name == 'tick':
        n = int(0.06 * SR); t = np.arange(n) / SR
        return np.sin(2 * np.pi * 2350 * t) * np.exp(-t / 0.012) * 0.06
    if name == 'drop':
        n = int(0.3 * SR); t = np.arange(n) / SR
        f = 210 - 90 * np.minimum(1, t / 0.12)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07) + 0.25 * sosfilt(butter(2, 900, 'low', fs=SR, output='sos'), noise(n)) * np.exp(-t / 0.02)
        return s * 0.2
    if name == 'paste':
        n = int(0.08 * SR); t = np.arange(n) / SR
        return sosfilt(butter(2, [2000, 7000], 'band', fs=SR, output='sos'), noise(n)) * np.exp(-t / 0.018) * 0.06
    if name == 'stamp':
        n = int(0.5 * SR); t = np.arange(n) / SR
        f = 95 - 35 * np.minimum(1, t / 0.2)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)
        thud = sosfilt(butter(2, 1100, 'low', fs=SR, output='sos'), noise(n)) * np.exp(-t / 0.025)
        return (body + 0.5 * thud) * 0.32
    if name == 'chime':
        ca, cb = {'guide': (84, 91), 'partner': (83, 90)}.get(NAME, (86, 93))
        a = bell(ca, 1.8, 0.5)
        b = bell(cb, 1.6, 0.35)
        out = np.zeros(len(a) + int(0.13 * SR)); out[:len(a)] += a; out[int(0.13 * SR):int(0.13 * SR) + len(b)] += b
        return out * 0.14
    if name in ('whoosh', 'swell'):
        d = 0.9 if name == 'whoosh' else 1.8
        n = int(d * SR); t = np.arange(n) / SR
        src = noise(n)
        out = np.zeros(n)
        seg = int(0.03 * SR)
        for i in range(0, n, seg):  # sweeping band-pass
            u = i / n
            fc = 300 + 1700 * (u ** 1.3) if name == 'whoosh' else 600 + 2600 * u
            lo, hi = fc * 0.6, min(fc * 1.6, 9000)
            blk = sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), src[max(0, i - 2048):i + seg])[-min(seg, n - i):]
            out[i:i + len(blk)] = blk
        envw = np.sin(np.pi * np.minimum(1, t / d)) ** 2 if name == 'whoosh' else (t / d) ** 2 * (1 - np.exp(-(d - t) / 0.08))
        g = 0.12 if name == 'whoosh' else 0.07
        if soft: g *= 0.55
        return out * envw * g
    return np.zeros(10)

fx = np.zeros((2, N))
for e in EV['sfx']:
    nm = e['name']
    s = sfx(nm, e.get('soft', False))
    pan = rng.uniform(-0.2, 0.2) if nm not in ('whoosh',) else 0.0
    if nm == 'whoosh':
        # moving pan: render twice with complementary gains
        half = len(s)
        ramp = np.linspace(-0.7, 0.7, half)
        i = int(e['t'] * SR)
        j = min(N, i + half)
        if i < N:
            l = np.cos((ramp + 1) * np.pi / 4)[:j - i] * 1.414; r = np.sin((ramp + 1) * np.pi / 4)[:j - i] * 1.414
            fx[0, i:j] += s[:j - i] * l; fx[1, i:j] += s[:j - i] * r
        continue
    place(fx, s, e['t'], pan=pan)
fxr = np.stack([fftconvolve(fx[c], IR[c] * 0.6)[:N] for c in range(2)])
fx = fx + 0.18 * fxr

mix = music + fx
mix = mix[:, :int(DUR * SR)]
mix = np.tanh(mix * 1.1) / 1.1
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89
out = f'out/{NAME}-audio.wav'
data = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print('wrote', out, f'{mix.shape[1] / SR:.2f}s peak-normalised')
