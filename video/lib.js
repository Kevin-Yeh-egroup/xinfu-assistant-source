// Storyboard builder: shots with local clocks, captions with reading-time guards,
// camera views computed from real UI element boxes (manifest from capture.js).
const path = require('path');
const fs = require('fs');
const M = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'manifest.json'), 'utf8'));

const SW = 1920, SH = 1080;
const IW = M.w, IH = M.h;          // screenshot size (px)
const BAR = 56;                    // window title bar (image px)
const CW = IW, CH = IH + BAR;      // window container size
const S0 = Math.min(1500 / CW, 860 / CH);
const TOP = 34;                    // window top on stage in full view
const CAP_ZONE = 168;              // bottom stage area kept for captions
const FULL = { s: S0, tx: (SW - CW * S0) / 2, ty: TOP };

function box(ref) {
  const [shot, key] = ref.split('.');
  const s = M.shots[shot];
  if (!s) throw new Error('no shot ' + shot);
  const b = s[key];
  if (!b) throw new Error('no box ' + ref);
  return [b[0], b[1] + BAR, b[2], b[3]];
}
function union(...refs) {
  const bs = refs.map(r => (typeof r === 'string' ? box(r) : r));
  const x0 = Math.min(...bs.map(b => b[0])), y0 = Math.min(...bs.map(b => b[1]));
  const x1 = Math.max(...bs.map(b => b[0] + b[2])), y1 = Math.max(...bs.map(b => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
}
const R = r => (r == null ? null : typeof r === 'string' ? box(r) : r);
// box in screenshot pixels (no window bar), for custom shots that place a screenshot themselves
function raw(ref) { const b = box(ref); return [b[0], b[1] - BAR, b[2], b[3]]; }

// camera view (s, tx, ty) that frames a box
function view(ref, o = {}) {
  const b = R(ref);
  if (!b) return { ...FULL };
  const zoom = o.zoom ?? 1.7;
  let s = S0 * zoom;
  s = Math.min(s, (o.fitW ?? 1640) / b[2], (o.fitH ?? 600) / b[3], o.max ?? 1.3);
  s = Math.max(s, S0);
  const cx = o.cx ?? 0.5, cy = o.cy ?? 0.43;
  let tx = SW * cx - s * (b[0] + b[2] / 2);
  let ty = SH * cy - s * (b[1] + b[3] / 2);
  const m = 40;
  if (s * CW > SW - 2 * m) tx = Math.min(m, Math.max(SW - m - s * CW, tx)); else tx = (SW - s * CW) / 2;
  const lo = Math.min(TOP, SH - CAP_ZONE + 20 - s * CH);
  ty = Math.min(TOP, Math.max(lo, ty));
  return { s, tx, ty };
}

function readTime(text, sub) {
  const n = [...String(text || '')].length, k = [...String(sub || '')].length;
  return Math.max(2.8, 1.0 + n / 5.2 + k / 9);
}

class Shot {
  constructor(type, o = {}) {
    this.type = type; this.o = o; this.t = 0;
    this.tin = o.tin || { type: 'zoom', d: 1.0 };
    this.caps = []; this.cur = null; this.sfx = []; this.minDur = o.minDur || 0;
    this.marks = {};
  }
  wait(d) { this.t += d; return this; }
  at(name) { this.marks[name] = this.t; return this; }
  cap(text, sub = '', o = {}) {
    if (this.cur) {
      const need = this.cur.t0 + this.cur.min;
      if (this.t < need) this.t = need;
      this.cur.t1 = this.t;
    }
    this.cur = { t0: this.t, text, sub, min: o.min ?? readTime(text, sub) };
    this.caps.push(this.cur);
    return this;
  }
  capEnd(extra = 0) {
    if (!this.cur) return this;
    const need = this.cur.t0 + this.cur.min;
    if (this.t < need) this.t = need;
    this.t += extra;
    this.cur.t1 = this.t; this.cur = null;
    return this;
  }
  // wait until the current caption has been on screen long enough to read (it stays up)
  untilCap(extra = 0) { if (this.cur) this.t = Math.max(this.t, this.cur.t0 + this.cur.min); this.t += extra; return this; }
  sound(name, o = {}) { this.sfx.push({ t: this.t + (o.dt || 0), name, ...o }); return this; }
  sfxAt(name, t, o = {}) { this.sfx.push({ t, name, ...o }); return this; }
  end(hold = 0.6) { this.t += hold; const hadCap = !!this.cur; this.capEnd(); this.dur = Math.max(this.t + (hadCap ? 0.8 : 0), this.minDur); return this; }
}

class Screen extends Shot {
  constructor(o) {
    super('screen', o);
    this.imgs = []; this.cams = []; this.spots = []; this.curs = []; this.clicks = []; this.tags = []; this.chips = []; this.veils = [];
    this.title = o.title || ''; this.chip = o.chip || '';
    this.lastCam = o.cam ? view(o.cam, o.camOpt) : { ...FULL };
    this.cams.push({ t: 0, d: 0, v: this.lastCam });
    this.curAnchor = { pt: [SW + 60, SH + 80] };
  }
  show(name, fade = 0.45) { this.imgs.push({ t: this.t, name, fade }); return this; }
  cam(ref, o = {}) { const v = view(ref, o); this.cams.push({ t: this.t + (o.dt || 0), d: o.d ?? 1.3, v }); this.lastCam = v; if (o.wait) this.t += o.wait === true ? (o.d ?? 1.3) : o.wait; return this; }
  full(o = {}) { return this.cam(null, o); }
  spot(ref, o = {}) { this.spots.push({ t: this.t + (o.dt || 0), d: o.d ?? 0.55, r: R(ref), pad: o.pad ?? 12 }); return this; }
  unspot(o = {}) { return this.spot(null, o); }
  move(ref, o = {}) {
    const d = o.d ?? 0.95;
    const to = Array.isArray(ref) && ref.length === 2 && o.stage ? { pt: ref } : { r: R(ref), ox: o.ox ?? 0.5, oy: o.oy ?? 0.5 };
    this.curs.push({ t: this.t, d, from: this.curAnchor, to, arc: o.arc ?? 0.12 });
    this.curAnchor = to;
    this.t += d; return this;
  }
  away(o = {}) { const to = { pt: o.pt || [SW + 80, SH + 100] }; this.curs.push({ t: this.t, d: o.d ?? 0.9, from: this.curAnchor, to, arc: 0.08 }); this.curAnchor = to; if (o.wait) this.t += o.d ?? 0.9; return this; }
  click(o = {}) { this.clicks.push(this.t); this.sfx.push({ t: this.t, name: 'click' }); this.t += o.after ?? 0.32; return this; }
  typeIn(names, dt = 0.16, fade = 0) { names.forEach(n => { this.imgs.push({ t: this.t, name: n, fade }); this.sfx.push({ t: this.t, name: 'key' }); this.t += dt; }); return this; }
  tag(ref, text, o = {}) { this.tags.push({ t0: this.t + (o.dt || 0), t1: this.t + (o.dt || 0) + (o.d ?? 3), r: R(ref), text, side: o.side || 'top', tone: o.tone || 'cocoa' }); if (o.sound !== false) this.sfx.push({ t: this.t + (o.dt || 0), name: 'pop' }); return this; }
  fileIn(text, ref, o = {}) { // file card flies from bottom-right into an element
    const d = o.d ?? 1.4;
    this.chips.push({ t0: this.t, t1: this.t + d, text, sub: o.sub || '檔案', from: { pt: o.from || [SW - 260, SH + 120] }, to: { r: R(ref), ox: 0.5, oy: 0.5 }, mode: 'in' });
    this.sfx.push({ t: this.t + d * 0.9, name: 'drop' });
    if (o.wait !== false) this.t += d; return this;
  }
  fileOut(text, ref, o = {}) { // file card leaves from an element to the right edge
    const d = o.d ?? 1.6;
    this.chips.push({ t0: this.t, t1: this.t + d, text, sub: o.sub || '檔案', from: { r: R(ref), ox: 0.5, oy: 0.5 }, to: { pt: o.to || [SW + 260, 300] }, mode: 'out' });
    this.sfx.push({ t: this.t + 0.1, name: 'whoosh', soft: true });
    if (o.wait !== false) this.t += d * 0.7; return this;
  }
  veil(text, d = 2.2) { this.veils.push({ t0: this.t, t1: this.t + d, text }); this.sfx.push({ t: this.t, name: 'swell', soft: true }); return this; }
  data() {
    return { type: 'screen', title: this.title, chip: this.chip, imgs: this.imgs, cams: this.cams, spots: this.spots, curs: this.curs, clicks: this.clicks, tags: this.tags, chips: this.chips, veils: this.veils };
  }
}

class Custom extends Shot {
  constructor(type, o = {}) { super(type, o); this.props = o.props || {}; }
  data() { return { type: this.type, props: this.props, marks: this.marks }; }
}

function assemble(shots, meta) {
  let t = 0;
  const out = [], caps = [], sfx = [], leaks = [];
  shots.forEach((sh, i) => {
    if (sh.dur == null) sh.end(0);
    const ov = i === 0 ? 0 : sh.tin.d;
    const t0 = i === 0 ? 0 : t - ov;
    const t1 = t0 + sh.dur;
    const next = shots[i + 1];
    const nextOv = next ? (next.tin.d) : 0;
    out.push({ i, t0, t1, dur: sh.dur, tin: sh.tin, ...sh.data() });
    sh.caps.forEach(c => {
      const a = t0 + c.t0, b = Math.min(t0 + (c.t1 ?? sh.dur), t1 - nextOv + 0.25);
      caps.push({ t0: a, t1: b, text: c.text, sub: c.sub });
    });
    sh.sfx.forEach(s => sfx.push({ ...s, t: t0 + s.t }));
    if (i > 0 && (sh.tin.type === 'zoom' || sh.tin.type === 'leak')) {
      sfx.push({ t: t0 + ov * 0.15, name: 'whoosh' });
      if (sh.tin.type === 'leak' || sh.tin.leak) leaks.push({ tc: t0 + ov * 0.5, d: ov * 1.6 });
    }
    t = t1;
  });
  const dur = t;
  // reading-time check
  const warn = [];
  caps.forEach(c => { const need = readTime(c.text, c.sub); if (c.t1 - c.t0 < need - 0.05) warn.push(`${(c.t1 - c.t0).toFixed(1)}s < ${need.toFixed(1)}s: ${c.text}`); });
  return { ...meta, W: SW, H: SH, dur, shots: out, caps, sfx: sfx.sort((a, b) => a.t - b.t), leaks, geo: { IW, IH, BAR, CW, CH, S0, TOP, FULL }, warn };
}

module.exports = { Screen, Custom, assemble, box, raw, union, view, readTime, FULL, S0, SW, SH, BAR };
