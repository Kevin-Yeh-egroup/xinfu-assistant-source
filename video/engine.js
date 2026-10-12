/* Deterministic stage renderer: window.seek(t) puts every element where it belongs at time t. */
(function () {
  const D = window.STORY, G = D.geo, ICON = window.ICON || {};
  const stage = document.getElementById('stage');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const P = (t, t0, d) => (d <= 0 ? (t >= t0 ? 1 : 0) : cl((t - t0) / d));
  const E = {
    io: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out: u => 1 - Math.pow(1 - u, 3),
    out5: u => 1 - Math.pow(1 - u, 5),
    in: u => u * u * u,
    sine: u => -(Math.cos(Math.PI * u) - 1) / 2,
    back: u => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
  };
  const ico = (n, cls) => '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24">' + (ICON[n] || '') + '</svg>';
  const SEAL_SVG = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17.5"/><circle cx="20" cy="20" r="13.5" stroke-width="1.2" opacity=".7"/><path d="M14 20.5l4 4 8-9"/></svg>';
  const CURSOR = '<svg width="46" height="46" viewBox="0 0 28 28"><path d="M5 3 L5 22.2 L10.3 17.5 L13.8 25.3 L17.3 23.8 L13.9 16.1 L20.8 16.1 Z" fill="#1E1A17" stroke="#fff" stroke-width="1.9" stroke-linejoin="round"/></svg>';
  const TIPX = 46 * 5 / 28, TIPY = 46 * 3 / 28;
  const decodes = [];

  /* ---------- background ---------- */
  const bg = el('div', 'bg', '<i class="b1"></i><i class="b2"></i><i class="b3"></i>');
  stage.appendChild(bg);
  const [b1, b2, b3] = bg.children;
  function seekBg(t) {
    b1.style.transform = `translate(${Math.sin(t * 0.11) * 90}px,${Math.cos(t * 0.08) * 60}px)`;
    b2.style.transform = `translate(${Math.cos(t * 0.07) * 110}px,${Math.sin(t * 0.09) * 70}px)`;
    b3.style.transform = `translate(${Math.sin(t * 0.06 + 1) * 140}px,${Math.cos(t * 0.1) * 60}px)`;
  }

  /* ---------- geometry helpers ---------- */
  function mixView(a, b, u) {
    if (u <= 0) return a; if (u >= 1) return b;
    const ca = [(960 - a.tx) / a.s, (540 - a.ty) / a.s], cb = [(960 - b.tx) / b.s, (540 - b.ty) / b.s];
    const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), u));
    const cx = lerp(ca[0], cb[0], u), cy = lerp(ca[1], cb[1], u);
    return { s, tx: 960 - s * cx, ty: 540 - s * cy };
  }
  const mixRect = (a, b, u) => [0, 1, 2, 3].map(i => lerp(a[i], b[i], u));
  const mapPt = (v, x, y) => [v.tx + v.s * x, v.ty + v.s * y];
  const mapRect = (v, r) => [v.tx + v.s * r[0], v.ty + v.s * r[1], v.s * r[2], v.s * r[3]];
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  }
  function anchorPos(a, v) {
    if (!a) return [2000, 1200];
    if (a.pt) return a.pt;
    return mapPt(v, a.r[0] + a.r[2] * (a.ox ?? 0.5), a.r[1] + a.r[3] * (a.oy ?? 0.5));
  }
  function img(src) { const im = new Image(); im.decoding = 'sync'; im.src = src; return im; }

  /* ---------- screen shot ---------- */
  function mkScreen(sh) {
    const root = el('div', 'shot screen');
    const win = el('div', 'win'); win.style.width = G.CW + 'px'; win.style.height = G.CH + 'px';
    win.innerHTML = '<div class="bar"><i></i><i></i><i></i><span>' + esc(sh.title) + '</span></div>';
    const imgs = el('div', 'imgs'); win.appendChild(imgs);
    sh.imgs.forEach(f => { f.el = img('assets/' + f.name + '.png'); imgs.appendChild(f.el); f.shown = false; });
    const spot = el('div', 'spot'), ring = el('div', 'ring');
    const veil = el('div', 'veil', '<span></span>');
    const tags = sh.tags.map(tg => el('div', 'tag ' + tg.tone + ' s-' + tg.side, '<span>' + esc(tg.text) + '</span>'));
    const chips = sh.chips.map(c => el('div', 'fchip', '<b>' + ico('file') + '</b><div><strong>' + esc(c.text) + '</strong><small>' + esc(c.sub) + '</small></div>'));
    const ripple = el('div', 'ripple'), cursor = el('div', 'cursor', CURSOR);
    root.append(win, spot, ring, veil, ...tags, ...chips, ripple, cursor);
    let chip = null;
    if (sh.chip) { chip = el('div', 'chapchip', '<em>' + esc(sh.chip.n) + '</em><span>' + esc(sh.chip.t) + '</span>'); root.appendChild(chip); }
    // camera keyframes: precompute starting state of each move
    const ks = sh.cams.slice().sort((a, b) => a.t - b.t);
    function evalCam(t, n) {
      let v = ks[0].v;
      for (let i = 1; i < n; i++) { const k = ks[i]; if (t < k.t) break; v = mixView(k.from, k.v, E.io(P(t, k.t, k.d))); }
      return v;
    }
    for (let i = 1; i < ks.length; i++) ks[i].from = evalCam(ks[i].t, i);
    const camAt = t => evalCam(t, ks.length);
    function spotAt(t) {
      let r = null, k = 0, pad = 12;
      for (const sp of sh.spots) {
        if (t < sp.t) break;
        const u = E.io(P(t, sp.t, sp.d));
        if (sp.r) { r = r && k > 0.01 ? mixRect(r, sp.r, u) : sp.r; k = lerp(k, 1, u); pad = sp.pad; }
        else k = lerp(k, 0, u);
      }
      return { r, k, pad };
    }
    function cursorAt(t, v) {
      if (!sh.curs.length || t < sh.curs[0].t) return null;
      let a = sh.curs[0].from;
      for (const c of sh.curs) {
        if (t < c.t) break;
        const u = P(t, c.t, c.d);
        if (u < 1) {
          const p0 = anchorPos(c.from, v), p1 = anchorPos(c.to, v), e = E.io(u);
          let x = lerp(p0[0], p1[0], e), y = lerp(p0[1], p1[1], e);
          const dx = p1[0] - p0[0], dy = p1[1] - p0[1], len = Math.hypot(dx, dy) || 1, off = Math.sin(Math.PI * e) * len * c.arc;
          return [x - dy / len * off, y + dx / len * off];
        }
        a = c.to;
      }
      return anchorPos(a, v);
    }
    function seek(lt, T) {
      const v = camAt(lt);
      // veil (time skip)
      let vk = 0, vtext = '';
      for (const w of sh.veils) { if (lt >= w.t0 && lt <= w.t1) { vk = E.io(P(lt, w.t0, 0.7)) * (1 - E.io(P(lt, w.t1 - 0.7, 0.7))); vtext = w.text; } }
      win.style.transform = `translate(${v.tx}px,${v.ty}px) scale(${v.s})`;
      win.style.filter = vk > 0.01 ? `blur(${(vk * 14).toFixed(2)}px) saturate(${1 - vk * 0.2})` : 'none';
      if (vk > 0.01) { veil.style.display = 'grid'; veil.firstChild.textContent = vtext; veil.style.opacity = vk; veil.firstChild.style.transform = `translateY(${(1 - vk) * 18}px)`; } else veil.style.display = 'none';
      // images
      let idx = -1; sh.imgs.forEach((f, i) => { if (f.t <= lt + 1e-6) idx = i; });
      sh.imgs.forEach((f, i) => {
        let o = 0;
        if (i === idx) o = f.fade > 0 ? E.io(P(lt, f.t, f.fade)) : 1;
        else if (idx > 0 && i === idx - 1 && sh.imgs[idx].fade > 0 && lt < sh.imgs[idx].t + sh.imgs[idx].fade) o = 1;
        if (o > 0) { if (f.el.style.display !== 'block') { f.el.style.display = 'block'; if (f.el.decode) decodes.push(f.el.decode().catch(() => {})); } f.el.style.opacity = o; }
        else if (f.el.style.display !== 'none') f.el.style.display = 'none';
      });
      // spotlight
      const sp = spotAt(lt);
      if (sp.r && sp.k > 0.01) {
        const m = mapRect(v, sp.r), pd = sp.pad * Math.min(1.4, Math.max(0.8, v.s / G.S0 * 0.7));
        const x = m[0] - pd, y = m[1] - pd, w = m[2] + pd * 2, h = m[3] + pd * 2;
        spot.style.display = 'block';
        spot.style.background = `rgba(44,30,22,${(0.40 * sp.k).toFixed(3)})`;
        spot.style.backdropFilter = `blur(${(3.2 * sp.k).toFixed(2)}px) saturate(${(1 - 0.25 * sp.k).toFixed(3)})`;
        spot.style.clipPath = `path(evenodd,"M0 0H1920V1080H0Z ${rr(x, y, w, h, 20)}")`;
        ring.style.display = 'block'; ring.style.opacity = sp.k;
        const br = 1 + 0.008 * Math.sin(T * 2.6);
        ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.style.width = w + 'px'; ring.style.height = h + 'px';
        ring.style.transform = `scale(${br})`;
      } else { spot.style.display = 'none'; ring.style.display = 'none'; }
      // tags
      sh.tags.forEach((tg, i) => {
        const e = tags[i];
        if (lt < tg.t0 || lt > tg.t1) { e.style.display = 'none'; return; }
        const kin = P(lt, tg.t0, 0.5), kout = P(lt, tg.t1 - 0.35, 0.35);
        const m = mapRect(v, tg.r);
        let x, y, tr;
        if (tg.side === 'top') { x = m[0] + m[2] / 2; y = m[1] - 22; tr = 'translate(-50%,-100%)'; }
        else if (tg.side === 'bottom') { x = m[0] + m[2] / 2; y = m[1] + m[3] + 22; tr = 'translate(-50%,0)'; }
        else if (tg.side === 'left') { x = m[0] - 24; y = m[1] + m[3] / 2; tr = 'translate(-100%,-50%)'; }
        else { x = m[0] + m[2] + 24; y = m[1] + m[3] / 2; tr = 'translate(0,-50%)'; }
        e.style.display = 'block'; e.style.left = x + 'px'; e.style.top = y + 'px';
        e.style.opacity = E.out(kin) * (1 - kout);
        e.style.transform = tr + ` scale(${lerp(0.82, 1, E.back(kin))})`;
        e.style.transformOrigin = tg.side === 'top' ? '50% 100%' : tg.side === 'bottom' ? '50% 0' : tg.side === 'left' ? '100% 50%' : '0 50%';
      });
      // file chips
      sh.chips.forEach((c, i) => {
        const e = chips[i];
        if (lt < c.t0 || lt > c.t1 + 0.05) { e.style.display = 'none'; return; }
        const u = P(lt, c.t0, c.t1 - c.t0), q = E.io(u);
        const p0 = anchorPos(c.from, v), p1 = anchorPos(c.to, v);
        const mx = (p0[0] + p1[0]) / 2, my = Math.min(p0[1], p1[1]) - 260;
        const x = (1 - q) * (1 - q) * p0[0] + 2 * (1 - q) * q * mx + q * q * p1[0];
        const y = (1 - q) * (1 - q) * p0[1] + 2 * (1 - q) * q * my + q * q * p1[1];
        let s, o;
        if (c.mode === 'in') { s = lerp(1, 0.38, E.in(u)); o = P(u, 0, 0.12) * (1 - P(u, 0.86, 0.14)); }
        else { s = lerp(0.38, 1, E.out(u)); o = P(u, 0, 0.1) * (1 - P(u, 0.8, 0.2)); }
        e.style.display = 'flex'; e.style.opacity = o;
        e.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${s}) rotate(${(c.mode === 'in' ? lerp(-7, 0, q) : lerp(0, 8, q)).toFixed(2)}deg)`;
      });
      // cursor + ripple
      const cp = cursorAt(lt, v);
      if (cp && cp[0] < 1990 && cp[1] < 1150) {
        let press = 0; for (const c of sh.clicks) { if (lt >= c - 0.05 && lt <= c + 0.25) press = Math.max(press, Math.sin(Math.PI * P(lt, c - 0.05, 0.3))); }
        cursor.style.display = 'block';
        cursor.style.transform = `translate(${cp[0] - TIPX}px,${cp[1] - TIPY}px) scale(${1 - 0.16 * press})`;
        let rp = null; for (const c of sh.clicks) { if (lt >= c && lt <= c + 0.7) rp = c; }
        if (rp != null) {
          const u = P(lt, rp, 0.7), r = lerp(10, 52, E.out(u));
          ripple.style.display = 'block'; ripple.style.width = ripple.style.height = (r * 2) + 'px';
          ripple.style.transform = `translate(${cp[0] - r}px,${cp[1] - r}px)`; ripple.style.opacity = (1 - u) * 0.95;
        } else ripple.style.display = 'none';
      } else { cursor.style.display = 'none'; ripple.style.display = 'none'; }
      if (chip) { const k = E.out(P(lt, 0.5, 0.6)); chip.style.opacity = k; chip.style.transform = `translateY(${(1 - k) * -12}px)`; }
    }
    return { el: root, seek };
  }

  /* ---------- title (opening) ---------- */
  function dust(n, seed) {
    let s = seed || 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: n }, () => ({ x: R() * 1920, y: R() * 1080, r: 1.5 + R() * 3.5, sp: 6 + R() * 18, ph: R() * 6.28, a: 0.15 + R() * 0.45 }));
  }
  function mkDarkBase(root) {
    root.innerHTML = '<div class="dbg"></div><div class="glow g1"></div><div class="glow g2"></div><div class="glow g3"></div><div class="dust"></div>';
    const ds = dust(46, 11), dEl = root.querySelector('.dust');
    const dots = ds.map(d => { const i = el('i'); i.style.width = i.style.height = d.r * 2 + 'px'; dEl.appendChild(i); return i; });
    const [g1, g2, g3] = root.querySelectorAll('.glow');
    return function (lt) {
      g1.style.transform = `translate(${Math.sin(lt * 0.25) * 90}px,${Math.cos(lt * 0.2) * 50}px)`;
      g2.style.transform = `translate(${Math.cos(lt * 0.22) * 100}px,${Math.sin(lt * 0.18) * 60}px)`;
      g3.style.transform = `translate(${Math.sin(lt * 0.3) * 60}px,0)`;
      ds.forEach((d, i) => { const y = (d.y - lt * d.sp + 1200) % 1200 - 60; dots[i].style.transform = `translate(${d.x + Math.sin(lt * 0.5 + d.ph) * 20}px,${y}px)`; dots[i].style.opacity = d.a * (0.6 + 0.4 * Math.sin(lt * 1.3 + d.ph)); });
    };
  }
  function mkTitle(sh) {
    const p = sh.props, root = el('div', 'shot dark title');
    const base = mkDarkBase(root);
    root.insertAdjacentHTML('beforeend', '<div class="tseal"><div class="wave"></div><svg viewBox="0 0 120 120"><circle class="r1" cx="60" cy="60" r="52" stroke-width="5"/><circle class="r2" cx="60" cy="60" r="41" stroke-width="2.4" opacity=".75"/><path class="ck" d="M40 61.5 54 75.5 80 47" stroke-width="7"/></svg></div>'
      + '<div class="tkick">' + esc(p.kick) + '</div><div class="tmain">' + esc(p.main) + '</div><div class="tline"></div><div class="tsub">' + esc(p.sub) + '</div><div class="ttag">' + esc(p.tag) + '</div>');
    const q = s => root.querySelector(s);
    const seal = q('.tseal'), wave = q('.tseal .wave'), r1 = q('.r1'), r2 = q('.r2'), ck = q('.ck');
    const L1 = 2 * Math.PI * 52, L2 = 2 * Math.PI * 41, L3 = 70;
    [[r1, L1], [r2, L2], [ck, L3]].forEach(([e, L]) => { e.style.strokeDasharray = L; });
    const kick = q('.tkick'), main = q('.tmain'), line = q('.tline'), sub = q('.tsub'), tag = q('.ttag');
    function seek(lt) {
      base(lt);
      root.querySelector('.dbg').style.opacity = 1;
      r1.style.strokeDashoffset = L1 * (1 - E.io(P(lt, 0.35, 1.2)));
      r2.style.strokeDashoffset = -L2 * (1 - E.io(P(lt, 0.65, 1.1)));
      ck.style.strokeDashoffset = L3 * (1 - E.out(P(lt, 1.45, 0.5)));
      const st = P(lt, 1.95, 0.45);
      seal.style.transform = `scale(${1 + 0.1 * Math.sin(Math.PI * st) * (1 - st)}) rotate(${-4 * E.out(P(lt, 1.9, 0.6))}deg)`;
      const wv = P(lt, 1.98, 1.1); wave.style.opacity = wv > 0 && wv < 1 ? (1 - wv) * 0.8 : 0; wave.style.transform = `scale(${1 + E.out(wv) * 0.9})`;
      const kk = E.out(P(lt, 2.05, 0.8)); kick.style.opacity = kk; kick.style.transform = `translateY(${(1 - kk) * 14}px)`;
      const km = E.out(P(lt, 2.25, 1.2)); main.style.opacity = km; main.style.letterSpacing = lerp(0.32, 0.08, km) + 'em'; main.style.filter = `blur(${(1 - km) * 10}px)`; main.style.transform = `translateY(${(1 - km) * 26}px)`;
      const kl = E.io(P(lt, 2.9, 0.9)); line.style.width = 420 * kl + 'px'; line.style.marginLeft = -210 * kl + 'px';
      const ks = E.out(P(lt, 3.15, 0.8)); sub.style.opacity = ks; sub.style.transform = `translateY(${(1 - ks) * 16}px)`;
      const kt = E.out(P(lt, 3.6, 0.9)); tag.style.opacity = kt; tag.style.transform = `translateY(${(1 - kt) * 16}px)`;
    }
    return { el: root, seek };
  }

  /* ---------- chapter card ---------- */
  function mkChapter(sh) {
    const p = sh.props, root = el('div', 'shot chapter');
    root.innerHTML = '<div class="cbg"></div>' + [[-220, -260, 760], [1380, 560, 900], [1500, -380, 520]].map(([x, y, s]) => `<div class="deco" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px"></div>`).join('')
      + '<div class="cseal"><div class="wave"></div><svg viewBox="0 0 250 250"><circle class="rg" cx="125" cy="125" r="118" stroke-width="5"/><circle class="rg" cx="125" cy="125" r="104" stroke-width="2" opacity=".7"/><circle class="rg" cx="125" cy="125" r="72" stroke-width="2" opacity=".5"/><defs><path id="ringp' + sh.i + '" d="M125 125 m-88 0 a88 88 0 1 1 176 0 a88 88 0 1 1 -176 0"/></defs><text textLength="548" lengthAdjust="spacing"><textPath href="#ringp' + sh.i + '">' + esc(p.ring) + '</textPath></text></svg><b>' + esc(p.num) + '</b></div>'
      + '<div class="ctitle">' + esc(p.title) + '</div><div class="csub">' + esc(p.sub) + '</div>';
    const q = s => root.querySelector(s);
    const seal = q('.cseal'), wave = q('.cseal .wave'), title = q('.ctitle'), sub = q('.csub'), svg = q('.cseal svg');
    function seek(lt) {
      const ks = P(lt, 0.3, 0.42);
      const sc = ks < 1 ? lerp(1.7, 0.95, E.in(ks)) : 0.95 + 0.05 * E.out(P(lt, 0.72, 0.35));
      seal.style.opacity = E.out(P(lt, 0.3, 0.18));
      seal.style.transform = `scale(${sc}) rotate(${lerp(-22, -7, E.out(ks))}deg)`;
      svg.style.transform = `rotate(${lt * 6}deg)`;
      const wv = P(lt, 0.7, 1.0); wave.style.opacity = wv > 0 && wv < 1 ? (1 - wv) * 0.7 : 0; wave.style.transform = `scale(${1 + E.out(wv) * 0.7})`;
      const kt = E.out(P(lt, 0.75, 0.9)); title.style.opacity = kt; title.style.transform = `translateY(${(1 - kt) * 24}px)`; title.style.letterSpacing = lerp(0.24, 0.12, kt) + 'em'; title.style.filter = `blur(${(1 - kt) * 6}px)`;
      const kb = E.out(P(lt, 1.05, 0.9)); sub.style.opacity = kb; sub.style.transform = `translateY(${(1 - kb) * 18}px)`;
      root.style.setProperty('--push', 1 + lt * 0.006);
    }
    return { el: root, seek };
  }

  /* ---------- flow diagram: two roles, two files ---------- */
  function mkFlow(sh) {
    const p = sh.props, root = el('div', 'shot flow');
    const L = [560, 470], Rn = [1360, 470];
    root.innerHTML = '<div class="fbg"></div><svg class="fsvg" viewBox="0 0 1920 1080">'
      + '<path class="pa" d="M1250 360 C1080 170 840 170 670 360" stroke="#C7402D" stroke-dasharray="14 16"/>'
      + '<path class="pb" d="M670 600 C840 790 1080 790 1250 600" stroke="#2F6B3D" stroke-dasharray="14 16"/>'
      + '<path class="ha" d="M690 318 670 360 715 352" stroke="#C7402D"/><path class="hb" d="M1230 642 1250 600 1205 608" stroke="#2F6B3D"/></svg>'
      + node('left', L, '引導員', p.leftSub || '準備資料、修改', 'docs', '#F2A93B', 'edit')
      + node('right', Rn, '審查人員', p.rightSub || '審查、確認', 'docs', '#C7402D', 'tools')
      + '<div class="fchip fa"><b>' + ico('file') + '</b><div><strong>' + esc(p.a || '需修改清單') + '</strong><small>' + esc(p.aSub || '審查人員 → 引導員') + '</small></div></div>'
      + '<div class="fchip fb"><b style="background:#E3F1E3;color:#2F6B3D">' + ico('file') + '</b><div><strong>' + esc(p.b || '修改回覆') + '</strong><small>' + esc(p.bSub || '引導員 → 審查人員') + '</small></div></div>';
    function node(cls, pos, title, sub, icon, color, subIcon) {
      return `<div class="fnode ${cls}" style="left:${pos[0] - 150}px;top:${pos[1] - 150}px"><div class="av">${ico('user')}<span class="sub" style="background:${color}">${ico(subIcon)}</span></div><h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`;
    }
    const q = s => root.querySelector(s);
    const pa = q('.pa'), pb = q('.pb'), ha = q('.ha'), hb = q('.hb'), nl = q('.fnode.left'), nr = q('.fnode.right'), fa = q('.fa'), fb = q('.fb');
    const la = pa.getTotalLength ? 900 : 900;
    function bez(t, a, b, c, d) { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }
    function seek(lt) {
      const kn1 = E.back(P(lt, 0.15, 0.6)), kn2 = E.back(P(lt, 0.35, 0.6));
      nl.style.opacity = P(lt, 0.15, 0.3); nl.style.transform = `scale(${lerp(0.7, 1, kn1)})`;
      nr.style.opacity = P(lt, 0.35, 0.3); nr.style.transform = `scale(${lerp(0.7, 1, kn2)})`;
      const da = E.io(P(lt, p.ta ?? 0.9, 1.0)), db = E.io(P(lt, p.tb ?? 3.0, 1.0));
      pa.style.opacity = da > 0 ? 1 : 0; pa.style.clipPath = `inset(0 0 0 ${(1 - da) * 100}%)`;
      pb.style.opacity = db > 0 ? 1 : 0; pb.style.clipPath = `inset(0 ${(1 - db) * 100}% 0 0)`;
      ha.style.opacity = P(lt, (p.ta ?? 0.9) + 0.9, 0.2); hb.style.opacity = P(lt, (p.tb ?? 3.0) + 0.9, 0.2);
      // chips travel along the arcs
      const ua = 0.84 * E.io(P(lt, (p.ta ?? 0.9) + 0.1, 1.5)), ub = 0.84 * E.io(P(lt, (p.tb ?? 3.0) + 0.1, 1.5));
      const ax = bez(ua, 1250, 1080, 840, 670), ay = bez(ua, 360, 170, 170, 360);
      const bx = bez(ub, 670, 840, 1080, 1250), by = bez(ub, 600, 790, 790, 600);
      fa.style.display = ua > 0 ? 'flex' : 'none'; fa.style.opacity = P(ua, 0, 0.15);
      fa.style.transform = `translate(${ax}px,${ay - 6}px) translate(-50%,-50%) scale(${0.9 + 0.1 * Math.sin(Math.PI * ua)})`;
      fb.style.display = ub > 0 ? 'flex' : 'none'; fb.style.opacity = P(ub, 0, 0.15);
      fb.style.transform = `translate(${bx}px,${by + 6}px) translate(-50%,-50%) scale(${0.9 + 0.1 * Math.sin(Math.PI * ub)})`;
    }
    return { el: root, seek };
  }

  /* ---------- AI assistant illustration ---------- */
  function mkAI(sh) {
    const p = sh.props, root = el('div', 'shot ai');
    const files = p.files; // [{name,type}]
    let h = '<div class="abg"></div><div class="folder"><div class="fh"><span class="fi">' + ico('folder') + '</span><div><strong>' + esc(p.folder) + '</strong><small>這個案子的文件都放這裡</small></div></div>';
    files.forEach((f, i) => { h += `<div class="frow r${i}" style="top:${132 + i * 94}px"><span class="ft t-${f.type}">${f.type === 'xls' ? 'XLS' : f.type === 'md' ? 'MD' : f.type === 'json' ? 'JSON' : 'PDF'}</span><span class="nm">${esc(f.name)}</span><span class="ok">${ico('check')}</span></div>`; });
    h += '</div><div class="aiw"><div class="ah"><i></i><i></i><i></i><span>' + ico('spark') + esc(p.title || 'AI 助手') + '</span></div>'
      + '<div class="bub me">' + esc(p.ask) + '</div>'
      + '<div class="bub ai a1">' + esc(p.reply1) + '<span class="dots"><i></i><i></i><i></i></span><ul>' + p.reads.map(r => '<li>' + ico('check') + esc(r) + '</li>').join('') + '</ul></div>'
      + '<div class="bub ai a2">' + p.reply2 + '</div></div>';
    root.innerHTML = h;
    const q = s => root.querySelector(s), qa = s => [...root.querySelectorAll(s)];
    const folder = q('.folder'), rows = qa('.frow'), aiw = q('.aiw'), me = q('.bub.me'), a1 = q('.a1'), a2 = q('.a2'), lis = qa('.a1 li'), dots = qa('.a1 .dots i'), dotsWrap = q('.a1 .dots');
    me.style.top = '108px'; a1.style.top = '338px'; a2.style.top = '338px';
    const T = p.t; // timing marks
    function seek(lt) {
      const kf = E.out(P(lt, 0, 0.7)); folder.style.opacity = kf; folder.style.transform = `translateY(${(1 - kf) * 30}px)`;
      rows.forEach((r, i) => {
        const f = files[i], t0 = f.at;
        const k = f.drop ? E.out(P(lt, t0, 0.55)) : E.out(P(lt, t0, 0.45));
        r.style.opacity = P(lt, t0, 0.25);
        r.style.transform = f.drop ? `translateY(${(1 - k) * -90}px)` : `translateX(${(1 - k) * -26}px)`;
        let bgc = 'transparent', sh2 = 'none';
        if (f.hl) { const kh = P(lt, t0, 0.4) * (1 - P(lt, t0 + (f.hlDur || 2.4), 0.8)); bgc = `rgba(${f.hl === 'sage' ? '227,241,227' : '253,235,200'},${kh})`; sh2 = kh > 0.01 ? `inset 0 0 0 3px rgba(${f.hl === 'sage' ? '79,138,91' : '242,169,59'},${kh * 0.8})` : 'none'; }
        const rd = f.readDur || 0.8;
        if (f.read != null) { const kr = P(lt, f.read, 0.2) * (1 - P(lt, f.read + rd, 0.3)); if (kr > 0) { bgc = `rgba(226,240,242,${kr})`; sh2 = `inset 0 0 0 3px rgba(61,124,138,${kr * 0.7})`; } }
        r.style.background = bgc; r.style.boxShadow = sh2;
        const ok = r.querySelector('.ok'); const tk = (f.read ?? 1e9) + rd - 0.25; const ko = f.read != null ? E.back(P(lt, tk, 0.4)) : 0; ok.style.opacity = P(lt, tk, 0.2); ok.style.transform = `scale(${lerp(0.4, 1, ko)})`;
      });
      const kw = E.out(P(lt, T.win, 0.8)); aiw.style.opacity = kw; aiw.style.transform = `translateX(${(1 - kw) * 70}px)`;
      const km = E.out(P(lt, T.ask, 0.5)); me.style.opacity = km; me.style.transform = `translateY(${(1 - km) * 16}px)`;
      const k1 = E.out(P(lt, T.reply1, 0.5)) * (1 - P(lt, T.reply2 - 0.4, 0.4)); a1.style.opacity = k1; a1.style.transform = `translateY(${(1 - E.out(P(lt, T.reply1, 0.5))) * 16}px)`;
      lis.forEach((li, i) => { const t0 = p.readAt[i] + 0.6; const k = E.out(P(lt, t0, 0.35)); li.style.opacity = k; li.style.transform = `translateX(${(1 - k) * 14}px)`; });
      dots.forEach((d, i) => { d.style.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(lt * 5 - i * 0.9)); });
      dotsWrap.style.opacity = 1 - P(lt, T.reply2 - 0.8, 0.3);
      const k2 = E.out(P(lt, T.reply2, 0.55)); a2.style.opacity = k2; a2.style.transform = `translateY(${(1 - k2) * 16}px)`;
    }
    return { el: root, seek };
  }

  /* ---------- end card ---------- */
  function mkEnd(sh) {
    const p = sh.props, root = el('div', 'shot dark end');
    const base = mkDarkBase(root);
    root.insertAdjacentHTML('beforeend', '<div class="ehead">' + esc(p.head) + '</div><div class="etiles n' + p.tiles.length + '">' + p.tiles.map((t, i) => '<div class="etile"><span class="n">' + (i + 1) + '</span><div class="ei">' + ico(t.icon) + '</div><h3>' + esc(t.title) + '</h3><p>' + esc(t.text) + '</p></div>').join('') + '</div>'
      + '<div class="eline">' + ico('shield') + '<span>' + esc(p.line) + '</span></div><div class="ebrand">' + SEAL_SVG + '<span>創業貸款準備助手<small>　' + esc(p.brandSub) + '</small></span></div>');
    const q = s => root.querySelector(s);
    const head = q('.ehead'), tiles = [...root.querySelectorAll('.etile')], line = q('.eline'), brand = q('.ebrand');
    function seek(lt) {
      base(lt);
      const kh = E.out(P(lt, 0.35, 0.9)); head.style.opacity = kh; head.style.transform = `translateY(${(1 - kh) * 22}px)`; head.style.filter = `blur(${(1 - kh) * 6}px)`;
      tiles.forEach((t, i) => { const k = E.out(P(lt, 1.1 + i * 0.75, 0.8)); t.style.opacity = k; t.style.transform = `translateY(${(1 - k) * 40}px) scale(${lerp(0.94, 1, k)})`; });
      const tl = Math.max(3.6, 1.1 + tiles.length * 0.75 + 0.3);
      const kl = E.out(P(lt, tl, 0.8)); line.style.opacity = kl; line.style.transform = `translateY(${(1 - kl) * 12}px)`;
      const kb = E.out(P(lt, tl + 0.7, 0.9)); brand.style.opacity = kb; brand.style.transform = `translateY(${(1 - kb) * 12}px)`;
    }
    return { el: root, seek };
  }

  /* ---------- build shots ---------- */
  const MK = { screen: mkScreen, title: mkTitle, chapter: mkChapter, flow: mkFlow, ai: mkAI, end: mkEnd };
  const SHOTS = D.shots.map(sh => { const S = MK[sh.type](sh); S.sh = sh; stage.appendChild(S.el); return S; });

  /* ---------- captions ---------- */
  const cap = el('div', '', ''); cap.id = 'cap'; stage.appendChild(cap);
  const meas = el('div', '', ''); meas.id = 'capMeasure'; stage.appendChild(meas);
  const CAPS = D.caps.map((c, i) => {
    const html = '<div class="m">' + esc(c.text) + '</div>' + (c.sub ? '<div class="s">' + esc(c.sub) + '</div>' : '');
    meas.innerHTML = html; const w = meas.offsetWidth, h = meas.offsetHeight;
    const t = el('div', 'ct', html); cap.appendChild(t);
    return { ...c, el: t, w: w + 92, h: h + 46 };
  });
  meas.remove();
  CAPS.forEach((c, i) => { const n = CAPS[i + 1], pv = CAPS[i - 1]; c.joinNext = !!(n && n.t0 - c.t1 < 0.2); c.joinPrev = !!(pv && c.t0 - pv.t1 < 0.2); });
  function seekCaps(t) {
    let pill = null;
    for (let i = 0; i < CAPS.length; i++) {
      const c = CAPS[i];
      const a0 = c.joinPrev ? c.t0 - 0.12 : c.t0, a1 = c.joinNext ? c.t1 + 0.06 : c.t1;
      if (t < a0 - 0.01 || t > a1 + 0.01) { c.el.style.display = 'none'; continue; }
      const kin = c.joinPrev ? E.out(P(t, c.t0 - 0.12, 0.42)) : E.out(P(t, c.t0, 0.45));
      const kout = c.joinNext ? E.io(P(t, c.t1 - 0.3, 0.36)) : E.in(P(t, c.t1 - 0.4, 0.4));
      const k = kin * (1 - kout);
      c.el.style.display = k > 0.002 ? 'block' : 'none'; c.el.style.opacity = k;
      const dy = (1 - kin) * 14 - (c.joinNext ? kout * 14 : 0);
      c.el.style.transform = `translate(-50%,-50%) translateY(${dy.toFixed(2)}px)`;
      let w = c.w, h = c.h, a = 1;
      if (c.joinNext) { const n = CAPS[i + 1], u = E.io(P(t, c.t1 - 0.3, 0.6)); w = lerp(c.w, n.w, u); h = lerp(c.h, n.h, u); }
      if (c.joinPrev) { const pv = CAPS[i - 1], u = E.io(P(t, c.t0 - 0.3, 0.6)); if (u < 1) { w = lerp(pv.w, c.w, u); h = lerp(pv.h, c.h, u); } }
      if (!c.joinPrev) a = Math.min(a, E.out(P(t, c.t0, 0.4)));
      if (!c.joinNext) a = Math.min(a, 1 - E.in(P(t, c.t1 - 0.35, 0.35)));
      if (!pill || a > pill.a) pill = { w, h, a };
    }
    if (pill && pill.a > 0.001) {
      cap.style.display = 'block'; cap.style.opacity = pill.a;
      cap.style.width = pill.w + 'px'; cap.style.height = pill.h + 'px';
      cap.style.transform = `translateX(-50%) translateY(${(1 - pill.a) * 16}px)`;
    } else cap.style.display = 'none';
  }

  /* ---------- light leak + vignette + final fade ---------- */
  const leak = el('div'); leak.id = 'leak'; stage.appendChild(leak);
  const vig = el('div'); vig.id = 'vig'; stage.appendChild(vig);
  const fadeK = el('div'); fadeK.id = 'fadeK'; stage.appendChild(fadeK);
  function seekLeak(t) {
    let best = 0, pos = 0;
    for (const L of D.leaks) { const u = (t - (L.tc - L.d / 2)) / L.d; if (u > 0 && u < 1) { const k = Math.pow(Math.sin(Math.PI * u), 2); if (k > best) { best = k; pos = u; } } }
    if (best > 0.01) { leak.style.display = 'block'; leak.style.opacity = best * 0.7; leak.style.transform = `translate(${lerp(-55, 55, pos)}%,${lerp(8, -8, pos)}%) scale(1.1)`; } else leak.style.display = 'none';
  }

  window.seek = async function (t) {
    seekBg(t);
    for (const S of SHOTS) {
      const sh = S.sh;
      if (t < sh.t0 - 1e-6 || t > sh.t1 + 1e-6) { S.el.style.display = 'none'; continue; }
      S.el.style.display = 'block';
      const lt = t - sh.t0;
      let op = 1, sc = 1, bl = 0, ty = 0;
      if (sh.i > 0 && sh.tin.d > 0 && lt < sh.tin.d) {
        const u = lt / sh.tin.d;
        if (sh.tin.type === 'zoom' || sh.tin.type === 'leak') { const e = E.out(u); op = E.io(Math.min(1, u * 1.25)); sc = lerp(0.955, 1, e); bl = lerp(9, 0, e); }
        else if (sh.tin.type === 'rise') { const e = E.out(u); op = e; ty = lerp(40, 0, e); }
        else if (sh.tin.type === 'fade') { op = E.io(u); }
      }
      const nx = D.shots[sh.i + 1];
      if (nx && nx.tin.d > 0 && t > sh.t1 - nx.tin.d) {
        const u = (t - (sh.t1 - nx.tin.d)) / nx.tin.d;
        if (nx.tin.type === 'zoom' || nx.tin.type === 'leak') { const e = E.in(u); sc *= lerp(1, 1.075, E.io(u)); bl = Math.max(bl, lerp(0, 13, e)); op *= 1 - E.io(Math.max(0, u - 0.25) / 0.75); }
        else if (nx.tin.type === 'fade' || nx.tin.type === 'rise') { op *= 1 - E.io(u); }
      }
      S.el.style.opacity = op;
      S.el.style.transform = (ty ? `translateY(${ty}px) ` : '') + `scale(${sc})`;
      S.el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : 'none';
      S.seek(lt, t);
    }
    seekCaps(t); seekLeak(t);
    fadeK.style.opacity = D.fadeOut ? E.io(P(t, D.dur - D.fadeOut, D.fadeOut)) : 0;
    if (decodes.length) { const ds = decodes.splice(0); await Promise.all(ds); }
    return true;
  };

  window.READY = (async () => {
    await document.fonts.ready;
    const imgs = [...document.querySelectorAll('img')];
    await Promise.all(imgs.map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
    return { shots: SHOTS.length, imgs: imgs.length, caps: CAPS.length };
  })();
})();
