/* =========================================================
   태풍고 틀 생성기 — 페어 틀 그리기 (2000×1420 PNG)
   흰색·연회색 바탕 + 파란 포인트. 양옆은 세로로 긴 캐릭터 틀(배경 그림을 연하게 + 큰 이름 + SD 스티커),
   가운데는 페어명과 찢은 노트 썰 카드 네 장 (조금씩 삐뚤게, 마스킹테이프)
   drawFrame(canvas, {
     mode: "one" | "two",          // 한 쌍(작은 SD) / 두 쌍(길쭉한 SD + 작은 SD 스티커)
     people: [P, P],                // P = { c, mbti, photo, art, small, tall, colors }
                                    //   photo: 프로필 두상(Image), art/small/tall: {img, s} | null
                                    //   colors: { hair, eye, point }
     story: {...} | null,           // stories.json 한 항목 (없으면 빈칸 안내)
     title: { name, colors: [] }    // 페어명과 글자별 색
   })
   ========================================================= */
const FW = 2000, FH = 1420;
const FC = {
  bg: "#F1F2F4", card: "#FFFFFF", line: "#DDE1E7", ink: "#23272F", text: "#3A404B", sub: "#8A919C",
  blue: "#3B7BE6", blueSoft: "#E3EDFC", tint: "rgba(227,237,252,.35)", empty: "#D9DEE6",
};
const FF = {
  title: '"Black Han Sans", sans-serif',
  body: '"Pretendard Variable", Pretendard, sans-serif',
  // 썰 카드 손글씨: 남자애는 펜글씨, 여자애는 동글동글
  handBoy: '"Nanum Pen Script", cursive',
  handGirl: '"Gamja Flower", cursive',
};
const PARTS = [["meet", "첫 만남"], ["some", "썸"], ["love", "연애"], ["end", "헤어짐"]];
const COLOR_SLOTS = [["hair", "머리"], ["eye", "눈"], ["point", "포인트"]];
const PANEL = { w: 516, h: 1268, y: 76, inset: 84 };

/* ---------- 도구 ---------- */
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function sparkle(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fillStyle = color; ctx.fill();
}
function starPath(ctx, cx, cy, R, rot = 0, inner = 0.46) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * inner : R, a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    ctx[i ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}
function drawStar(ctx, cx, cy, R, rot, fill, stroke) {
  ctx.save();
  starPath(ctx, cx, cy, R, rot);
  ctx.lineJoin = "round";
  ctx.lineWidth = 10; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 3.5; ctx.strokeStyle = stroke; ctx.stroke();
  ctx.restore();
}
// 한국어 줄바꿈: 띄어쓰기 단위로 끊고, 한 단어가 너무 길면 글자 단위로
function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text || "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? line + " " + word : word;
      if (ctx.measureText(tryLine).width <= maxW) { line = tryLine; continue; }
      if (line) out.push(line);
      line = "";
      if (ctx.measureText(word).width <= maxW) { line = word; continue; }
      for (const ch of word) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ""; }
        line += ch;
      }
    }
    if (line) out.push(line);
  }
  return out;
}
function fitText(ctx, text, maxW, maxLines, fontOf, sizes) {
  for (const size of sizes) {
    ctx.font = fontOf(size);
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) return { lines, size };
  }
  const size = sizes[sizes.length - 1];
  ctx.font = fontOf(size);
  const lines = wrap(ctx, text, maxW).slice(0, maxLines);
  lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "…");
  return { lines, size };
}
function fitWidth(ctx, text, maxW, fontOf, size, min = 20) {
  for (let s = size; s >= min; s -= 2) {
    ctx.font = fontOf(s);
    if (ctx.measureText(text).width <= maxW) return s;
  }
  return min;
}
let NOISE = null;
function noiseTile() {
  if (NOISE) return NOISE;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return (NOISE = c);
}
// 곱하기용 입자: 밝은 회색 점들 (흰 종이에도 보이게)
let GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const d = x.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = Math.random();
    const v = r < 0.015 ? 175 + Math.random() * 40 : 236 + Math.random() * 19;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return (GRAIN = c);
}
function paperTexture(ctx, seedKey) {
  const rand = seeded(strHash(seedKey + "#tex"));
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = ctx.createPattern(grainTile(), "repeat");
  ctx.fillRect(0, 0, FW, FH);
  // 구김: 밝고 어두운 큰 얼룩을 부드럽게
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 1;
  for (let i = 0; i < 26; i++) {
    const x = rand() * FW, y = rand() * FH, r = 160 + rand() * 360;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() < 0.5;
    g.addColorStop(0, dark ? "rgba(0,0,0,.16)" : "rgba(255,255,255,.35)");
    g.addColorStop(1, "rgba(128,128,128,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 구김 선 몇 줄
  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 7; i++) {
    const x1 = rand() * FW, y1 = rand() * FH, a = rand() * Math.PI, len = 400 + rand() * 700;
    ctx.strokeStyle = "rgba(120,130,150,.07)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 60, y1 + Math.sin(a) * len * 0.5 + (rand() - 0.5) * 60);
    ctx.lineTo(x1 + Math.cos(a) * len, y1 + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}
function softShadow(ctx, blur = 24, y = 6, a = 0.07) {
  ctx.shadowColor = `rgba(30,40,60,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y;
}
function noShadow(ctx) { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
const strHash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- SD 스티커: 흰 테두리 + 살짝 그림자, 발끝 기준 ---------- */
function outlined(img, w, h, pad) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(h + pad * 2);
  const x = c.getContext("2d");
  const sil = document.createElement("canvas");
  sil.width = c.width; sil.height = c.height;
  const sx = sil.getContext("2d");
  sx.drawImage(img, pad, pad, w, h);
  sx.globalCompositeOperation = "source-in";
  sx.fillStyle = "#fff"; sx.fillRect(0, 0, sil.width, sil.height);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    x.drawImage(sil, Math.cos(a) * pad * 0.8, Math.sin(a) * pad * 0.8);
  }
  x.drawImage(img, pad, pad, w, h);
  return c;
}
function figureSize(fig, targetH) {
  const h = targetH * (fig.s || 1), w = (fig.img.width * h) / fig.img.height;
  return { w, h };
}
function drawFigure(ctx, fig, cx, footY, targetH, chibi) {
  if (!fig) {
    const h = targetH, hr = chibi ? h * 0.24 : h * 0.12;
    ctx.fillStyle = FC.empty;
    ctx.beginPath(); ctx.arc(cx, footY - h + hr, hr, 0, Math.PI * 2); ctx.fill();
    const top = footY - h + hr * 2 - 6, bw = chibi ? hr * 1.3 : hr * 1.9;
    rrect(ctx, cx - bw / 2, top, bw, footY - top, bw * 0.3); ctx.fill();
    return footY - h;
  }
  const { w, h } = figureSize(fig, targetH);
  const pad = 8;
  ctx.save();
  softShadow(ctx, 18, 6, 0.16);
  ctx.drawImage(outlined(fig.img, w, h, pad), cx - w / 2 - pad, footY - h - pad);
  ctx.restore();
  return footY - h;
}

/* ---------- 말풍선 ---------- */
// 말풍선은 머리 바로 위에 (minY보다 위로는 안 올라감)
function drawBubble(ctx, text, cx, minY, w, tailX, tailY, filled) {
  if (!text) return;
  const { lines, size } = fitText(ctx, text, w - 56, 2, (z) => `700 ${z}px ${FF.body}`, [30, 28, 26, 24]);
  const lh = size + 10, h = lines.length * lh + 40, x = cx - w / 2;
  // 머리에서 조금 띄우기: 꼬리 끝이 머리 위 30px에서 멈춤
  tailY -= 30;
  const y = Math.max(minY, tailY - h - 30);
  const tx = Math.min(Math.max(tailX, x + 50), x + w - 50);
  const shape = () => {
    rrect(ctx, x, y, w, h, 30);
    ctx.moveTo(tx - 18, y + h - 1); ctx.lineTo(tailX, Math.max(tailY, y + h + 22)); ctx.lineTo(tx + 18, y + h - 1);
  };
  ctx.save();
  softShadow(ctx, 14, 4, 0.1);
  ctx.fillStyle = FC.card;
  shape(); ctx.fill();
  noShadow(ctx);
  {
    ctx.lineWidth = 3; ctx.strokeStyle = FC.blue; ctx.lineJoin = "round";
    rrect(ctx, x, y, w, h, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 18, y + h); ctx.lineTo(tailX, Math.max(tailY, y + h + 22)); ctx.lineTo(tx + 18, y + h); ctx.stroke();
    ctx.fillStyle = FC.card; ctx.fillRect(tx - 16, y + h - 4, 32, 6);
  }
  ctx.font = `700 ${size}px ${FF.body}`; ctx.textAlign = "center"; ctx.fillStyle = filled ? FC.ink : FC.blue;
  lines.forEach((l, i) => ctx.fillText(l, cx, y + 20 + size - 2 + i * lh));
  ctx.restore();
}

/* ---------- 양옆 긴 캐릭터 틀 ---------- */
function drawPanel(ctx, P, side, mode, story) {
  const { w, h, y } = PANEL;
  const left = side === 0;
  const x = left ? PANEL.inset : FW - PANEL.inset - w;
  // 틀
  ctx.save();
  softShadow(ctx, 26, 8, 0.08);
  ctx.fillStyle = FC.card;
  rrect(ctx, x, y, w, h, 44); ctx.fill();
  noShadow(ctx);
  // 배경 그림 (전신 그림이 있으면 그것, 없으면 두상) 연하게
  ctx.save();
  rrect(ctx, x, y, w, h, 44); ctx.clip();
  // 배경: 직접 올린 그림 → 프로필 문서 전신 → 두상
  // 크게 확대하고 살짝 기울여서 틀을 빈틈없이 채움 (머리·상반신이 보이게)
  const bg = P.bg ? null : (P.art && P.art.img) || P.full || P.photo;
  if (P.bg && P.bg.kind === "paper") {
    // 부적: 틀 폭보다 살짝 크게, 세로 가운데
    const im = P.bg.img, k = (w * 1.1) / im.width;
    ctx.globalAlpha = 0.42;
    ctx.drawImage(im, x + w / 2 - (im.width * k) / 2, y + h / 2 - (im.height * k) / 2, im.width * k, im.height * k);
    ctx.globalAlpha = 1;
  } else if (P.bg && P.bg.kind === "heart") {
    // 하트 속 증명사진: SD 머리 위쪽에 보이게
    const im = P.bg.img, k = (w * 0.82) / im.width;
    ctx.globalAlpha = 0.62;
    ctx.drawImage(im, x + w / 2 - (im.width * k) / 2, y + 140, im.width * k, im.height * k);
    ctx.globalAlpha = 1;
  }
  if (bg) {
    const tilt = left ? -0.13 : 0.13, c = Math.cos(tilt), s = Math.sin(tilt);
    const cover = Math.max((w * c + h * s) / bg.width, (w * s + h * c) / bg.height);
    const k = cover * (P.art || P.full ? 1.45 : 1.15);
    ctx.globalAlpha = P.art || P.full ? 0.3 : 0.2;
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt);
    // 그림 윗부분(얼굴 쪽)이 틀 가운데 위로 오게 아래로 밀어서 그림
    ctx.drawImage(bg, -bg.width * k / 2, -h * c / 2 - bg.height * k * 0.04, bg.width * k, bg.height * k);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = FC.tint; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = FC.line;
  rrect(ctx, x, y, w, h, 44); ctx.stroke();
  ctx.restore();

  // 큰 이름 + 한 줄 정보
  const tx = left ? x + 44 : x + w - 44;
  ctx.textAlign = left ? "left" : "right";
  const ns = fitWidth(ctx, P.c.name, w - 88, (z) => `${z}px ${FF.title}`, 128, 60);
  ctx.font = `${ns}px ${FF.title}`; ctx.fillStyle = FC.blue;
  ctx.fillText(P.c.name, tx, y + 160);
  ctx.font = `600 28px ${FF.body}`; ctx.fillStyle = FC.sub;
  ctx.fillText([`${P.c.grade}학년`, P.mbti].filter(Boolean).join(" · "), tx, y + 210);

  // 색상 칩 (머리 · 눈 · 포인트)
  const cols = COLOR_SLOTS.filter(([k]) => P.colors && P.colors[k]);
  cols.forEach(([k], i) => {
    const cx = left ? tx + 24 + i * 78 : tx - 24 - (cols.length - 1 - i) * 78, cy = y + 262;
    ctx.save();
    softShadow(ctx, 8, 2, 0.12);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = P.colors[k];
    ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
  });

  // SD: 한 쌍 = 작은 SD, 두 쌍 = 길쭉한 SD + 작은 SD 스티커
  const foot = y + h - 30, mid = x + w / 2;
  let headTop, headX;
  if (mode === "two") {
    const main = P.tall || P.small;
    headX = mid + (left ? 40 : -40);
    headTop = drawFigure(ctx, main, headX, foot, P.tall ? 790 : 700, !P.tall);
    if (P.tall) drawFigure(ctx, P.small, left ? x + 110 : x + w - 110, y + h + 30, 330, true);
  } else {
    headX = mid;
    headTop = drawFigure(ctx, P.small, mid, foot, 720, true);
  }

  // 말풍선: 이름 아래, 머리 위
  const line = story && story.lines ? story.lines[P.c.id] : "";
  if (line) drawBubble(ctx, line, mid, y + 330, 410, headX, headTop + 6, left);
}

/* ---------- 가운데 위: 페어명 (글자마다 색) + 태그 ---------- */
function drawTitle(ctx, name, tags, colors = []) {
  const text = String(name || "").trim();
  const s = fitWidth(ctx, text, 700, (z) => `${z}px ${FF.title}`, 136, 70);
  ctx.font = `${s}px ${FF.title}`; ctx.textAlign = "left";
  const total = ctx.measureText(text).width;
  let x = FW / 2 - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillStyle = colors[i] || FC.ink;
    ctx.fillText(ch, x, 196);
    x += ctx.measureText(ch).width;
  });
  const half = total / 2;
  sparkle(ctx, FW / 2 + half + 32, 88, 22, FC.blue);
  sparkle(ctx, FW / 2 + half + 62, 126, 11, FC.blue);
  sparkle(ctx, FW / 2 - half - 30, 178, 14, FC.blue);

  const list = (tags || []).filter(Boolean).slice(0, 4);
  if (!list.length) return;
  let fs = 27;
  ctx.font = `700 ${fs}px ${FF.body}`;
  let pads = list.map((t) => ctx.measureText(t).width + 40);
  while (pads.reduce((a, b) => a + b, 0) + 12 * (list.length - 1) > 720 && fs > 20) {
    fs -= 1; ctx.font = `700 ${fs}px ${FF.body}`;
    pads = list.map((t) => ctx.measureText(t).width + 40);
  }
  const totalW = pads.reduce((a, b) => a + b, 0) + 12 * (list.length - 1);
  let px = FW / 2 - totalW / 2;
  list.forEach((t, i) => {
    ctx.fillStyle = FC.blueSoft;
    rrect(ctx, px, 226, pads[i], 50, 25); ctx.fill();
    ctx.fillStyle = FC.blue; ctx.textAlign = "center";
    ctx.fillText(t, px + pads[i] / 2, 260);
    px += pads[i] + 12;
  });
}

/* ---------- 가운데: 찢은 노트 썰 카드 2×2 + 마스킹테이프 ---------- */
function paperPath(ctx, w, h, torn, rand) {
  const jag = (y0, dir) => {
    const pts = [];
    for (let x = 0; x < w; x += 9 + rand() * 8) pts.push([x, y0 + dir * rand() * 9]);
    pts.push([w, y0 + dir * rand() * 9]);
    return pts;
  };
  ctx.beginPath();
  if (torn === "top") {
    const top = jag(0, 1);
    ctx.moveTo(top[0][0], top[0][1]);
    top.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.lineTo(w, h); ctx.lineTo(0, h);
  } else {
    ctx.moveTo(0, 0); ctx.lineTo(w, 0);
    jag(h, -1).reverse().forEach(([px, py]) => ctx.lineTo(px, py));
  }
  ctx.closePath();
}
function paperPattern(ctx, w, h, kind) {
  if (kind === "grid") {
    ctx.strokeStyle = "rgba(120,135,160,.13)"; ctx.lineWidth = 1.5;
    for (let x = 18; x < w; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 18; y < h; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (kind === "dot") {
    ctx.fillStyle = "rgba(120,135,160,.24)";
    for (let y = 20; y < h; y += 26) for (let x = 20; x < w; x += 26) { ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // 줄 노트: 글씨 줄에 맞춘 가로줄 + 왼쪽 여백선
    ctx.strokeStyle = "rgba(59,123,230,.16)"; ctx.lineWidth = 2;
    for (let y = 150; y < h - 6; y += 37) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = "rgba(59,123,230,.24)";
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(18, h); ctx.stroke();
  }
}
// 스프링 노트에서 뜯은 구멍 자국
function punchHoles(ctx, w) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let x = 28; x < w - 10; x += 34) { ctx.beginPath(); ctx.arc(x, 15, 6.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawTape(ctx, cx, cy, w, rot, style) {
  const h = 38;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  for (let i = 1; i <= 6; i++) ctx.lineTo(-w / 2 + (i % 2 ? 5 : 0), -h / 2 + (i * h) / 6);
  ctx.lineTo(w / 2, h / 2);
  for (let i = 1; i <= 6; i++) ctx.lineTo(w / 2 - (i % 2 ? 5 : 0), h / 2 - (i * h) / 6);
  ctx.closePath();
  ctx.fillStyle = style === "gray" ? "rgba(210,215,222,.9)" : style === "white" ? "rgba(255,255,255,.85)" : "rgba(150,186,240,.72)";
  ctx.fill();
  ctx.clip();
  if (style === "stripe") {
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 7;
    for (let x = -w; x < w; x += 18) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, -h); ctx.stroke(); }
  } else if (style === "white") {
    ctx.fillStyle = "rgba(59,123,230,.35)";
    for (let x = -w / 2 + 10; x < w / 2; x += 16) for (let y = -h / 2 + 8, r = 0; y < h / 2; y += 14, r++) {
      ctx.beginPath(); ctx.arc(x + (r % 2 ? 8 : 0), y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
// 교환일기처럼: 01·03은 A가, 02·04는 B가 쓴 손글씨
// 다꾸처럼 크기·기울기·위치를 제각각 (페어마다 배치 세 가지 중 하나 + 조금씩 흔들기)
const CARD_LAYOUTS = [
  [[0, 312, 350, 470, -0.06], [380, 360, 340, 440, 0.05], [20, 820, 340, 470, 0.04], [370, 845, 350, 470, -0.05]],
  [[10, 330, 340, 450, 0.05], [375, 300, 345, 470, -0.04], [-5, 845, 350, 470, -0.03], [385, 820, 335, 480, 0.06]],
  [[0, 320, 360, 455, -0.035], [395, 345, 325, 455, 0.07], [30, 830, 330, 480, 0.06], [375, 860, 345, 455, -0.06]],
];
function drawSticky(p, w, h) {
  p.fillStyle = "#E3EDFC"; p.fillRect(0, 0, w, h);
  p.fillStyle = "rgba(59,123,230,.08)"; p.fillRect(0, 0, w, 46);
  const g = p.createLinearGradient(w - 70, h - 70, w, h);
  g.addColorStop(0, "rgba(30,40,60,0)"); g.addColorStop(1, "rgba(30,40,60,.08)");
  p.fillStyle = g; p.fillRect(0, 0, w, h);
}
function drawCards(ctx, story, seedKey, writers) {
  const rand = seeded(strHash(seedKey));
  const cx0 = PANEL.inset + PANEL.w + 40;
  const layout = CARD_LAYOUTS[Math.floor(rand() * CARD_LAYOUTS.length)];
  const papers = ["lined", "grid", "sticky", "dot"].sort(() => rand() - 0.5);
  const tapes = ["stripe", "gray", "plain", "white"].sort(() => rand() - 0.5);
  const placed = [];
  PARTS.forEach(([key, label], i) => {
    const text = story && story.parts ? story.parts[key] : "";
    const [dx, dy, w, h, r0] = layout[i];
    const rot = r0 + (rand() - 0.5) * 0.02;
    const x = cx0 + dx + (rand() - 0.5) * 12, y = dy + (rand() - 0.5) * 12;
    const kind = papers[i];
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
    const paper = document.createElement("canvas");
    paper.width = Math.ceil(w); paper.height = Math.ceil(h + 12);
    const p = paper.getContext("2d");
    if (kind === "sticky") drawSticky(p, w, h);
    else {
      const torn = rand() < 0.5 ? "top" : "bottom";
      paperPath(p, w, h, torn, rand);
      p.fillStyle = i % 2 ? "#FDFDFB" : "#FFFFFF"; p.fill();
      p.save(); p.clip(); paperPattern(p, w, h, kind); p.restore();
      if (torn === "bottom" && rand() < 0.6) punchHoles(p, w);
    }
    softShadow(ctx, 14, 5, 0.1);
    ctx.drawImage(paper, 0, 0);
    noShadow(ctx);
    // 제목: 숫자 + 형광펜 그은 제목
    ctx.font = `44px ${FF.title}`; ctx.textAlign = "left"; ctx.fillStyle = FC.blue;
    ctx.fillText(`0${i + 1}`, 36, 90);
    const nw = ctx.measureText(`0${i + 1}`).width;
    ctx.font = `38px ${FF.title}`;
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = kind === "sticky" ? "rgba(255,255,255,.8)" : "rgba(150,186,240,.45)";
    ctx.fillRect(36 + nw + 12, 72, lw + 10, 18);
    ctx.fillStyle = FC.ink;
    ctx.fillText(label, 36 + nw + 16, 88);
    // 본문: 손글씨 (줄 노트면 줄에 맞춤)
    if (text) {
      const who = writers ? writers[i % 2] : null;
      const girl = who && who.gender === "여";
      const font = girl ? FF.handGirl : FF.handBoy;
      const sizes = girl ? [30, 29, 28, 27, 26] : [35, 34, 33, 32, 31];
      const maxLines = Math.floor((h - 168) / 37) + 1;
      const { lines, size } = fitText(ctx, text, w - 72, maxLines, (z) => `400 ${z}px ${font}`, sizes);
      ctx.font = `400 ${size}px ${font}`; ctx.fillStyle = FC.text;
      lines.forEach((l, k) => ctx.fillText(l, 38, 143 + k * 37));
    } else {
      ctx.font = `600 26px ${FF.body}`; ctx.fillStyle = FC.sub; ctx.textAlign = "center";
      ctx.fillText("아직 썰이 없어요", w / 2, h / 2 + 30);
    }
    ctx.restore();
    placed.push({ x, y, w, h, sticky: kind === "sticky" });
  });
  // 테이프: 위에 하나(가끔 양쪽 모서리), 아래 모서리에도 엇갈리게. 포스트잇은 테이프 없이
  placed.forEach(({ x, y, w, h, sticky }, i) => {
    if (sticky) return;
    if (rand() < 0.35) {
      drawTape(ctx, x + 22, y + 12, 110, -0.7 + rand() * 0.2, tapes[i]);
      drawTape(ctx, x + w - 22, y + 12, 110, 0.7 - rand() * 0.2, tapes[i]);
    } else {
      drawTape(ctx, x + w / 2 + (rand() - 0.5) * 90, y + 4, 140 + rand() * 30, (rand() - 0.5) * 0.35, tapes[i]);
    }
    if (i === 1 || i === 2 || rand() < 0.3) {
      const right = i % 2 === 0;
      drawTape(ctx, right ? x + w - 18 : x + 18, y + h - 10, 104, right ? -0.72 : 0.72, tapes[(i + 2) % 4]);
    }
  });
}

/* ---------- 가장자리 꾸미기: 테이프 · 별 · 반짝이 ---------- */
function drawDeco(ctx) {
  const L = PANEL.inset, R = FW - PANEL.inset, T = PANEL.y, Bt = PANEL.y + PANEL.h;
  // 긴 틀 테이프: 대각선으로 엇갈리게 (A는 왼쪽 위·오른쪽 아래, B는 오른쪽 위·왼쪽 아래)
  drawTape(ctx, L + 22, T + 18, 150, -0.72, "stripe");
  drawTape(ctx, L + PANEL.w - 24, Bt - 16, 140, -0.72, "gray");
  drawTape(ctx, R - 22, T + 18, 150, 0.72, "gray");
  drawTape(ctx, R - PANEL.w + 24, Bt - 16, 140, 0.72, "stripe");
  // 별
  drawStar(ctx, L + PANEL.w - 12, T + 18, 34, 0.25, FC.blue, FC.ink);
  drawStar(ctx, R - PANEL.w + 14, T + 22, 24, -0.2, "#fff", FC.ink);
  // 반짝이
  sparkle(ctx, L + PANEL.w + 20, 842, 16, FC.blue);
  sparkle(ctx, R - PANEL.w - 18, 318, 13, FC.blue);
}

/* ---------- 배경에 깔리는 청춘 소품 (틀 뒤로 살짝 삐져나오게, 연하게) ---------- */
function at(ctx, x, y, rot, alpha, fn) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = alpha;
  fn();
  ctx.restore();
}
// 찢은 줄 노트
function propNotebook(ctx, w, h, rand, kind = "lined") {
  softShadow(ctx, 16, 6, 0.1);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
  for (let x = w / 2; x > -w / 2; x -= 10 + rand() * 8) ctx.lineTo(x, h / 2 - rand() * 12);
  ctx.lineTo(-w / 2, h / 2); ctx.closePath();
  ctx.fillStyle = "#FDFDFC"; ctx.fill();
  noShadow(ctx);
  ctx.save(); ctx.clip();
  if (kind === "grid") {
    ctx.strokeStyle = "rgba(120,135,160,.16)"; ctx.lineWidth = 1.5;
    for (let x = -w / 2 + 14; x < w / 2; x += 28) { ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); ctx.stroke(); }
    for (let y = -h / 2 + 14; y < h / 2; y += 28) { ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
  } else {
    ctx.strokeStyle = "rgba(59,123,230,.18)"; ctx.lineWidth = 2;
    for (let y = -h / 2 + 90; y < h / 2; y += 34) { ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
    ctx.strokeStyle = "rgba(229,72,77,.25)";
    ctx.beginPath(); ctx.moveTo(-w / 2 + 60, -h / 2); ctx.lineTo(-w / 2 + 60, h / 2); ctx.stroke();
  }
  ctx.restore();
  if (kind === "lined") {
    ctx.save(); ctx.fillStyle = FC.bg; // 구멍: 바탕색으로 (전체 그림을 뚫지 않게)
    for (let y = -h / 2 + 40; y < h / 2 - 20; y += 40) { ctx.beginPath(); ctx.arc(-w / 2 + 24, y, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
// 폰 (잠금화면에 시간)
function propPhone(ctx) {
  const w = 300, h = 600;
  softShadow(ctx, 20, 8, 0.14);
  ctx.fillStyle = "#DCE1E8"; rrect(ctx, -w / 2, -h / 2, w, h, 46); ctx.fill();
  noShadow(ctx);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#BFD6F6"); g.addColorStop(1, "#F2F6FC");
  ctx.fillStyle = g; rrect(ctx, -w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 36); ctx.fill();
  ctx.fillStyle = "#23272F"; rrect(ctx, -40, -h / 2 + 24, 80, 22, 11); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.font = `600 22px ${FF.body}`; ctx.fillText("10월 22일 목요일", 0, -h / 2 + 110);
  ctx.font = `800 84px ${FF.body}`; ctx.fillText("08:20", 0, -h / 2 + 196);
  ctx.fillStyle = "rgba(255,255,255,.75)"; rrect(ctx, -w / 2 + 30, -h / 2 + 250, w - 60, 74, 18); ctx.fill();
  ctx.fillStyle = "#3A404B"; ctx.textAlign = "left"; ctx.font = `700 19px ${FF.body}`;
  ctx.fillText("♪ 오늘의 노래", -w / 2 + 48, -h / 2 + 282);
  ctx.fillStyle = "#8A919C"; ctx.font = `500 17px ${FF.body}`;
  ctx.fillText("재생 중 · 0:42", -w / 2 + 48, -h / 2 + 308);
}
function drawBackdrop(ctx, seedKey) {
  const rand = seeded(strHash(seedKey + "#bg"));
  // 종이 몇 장 + 폰 하나만 (가장자리로 살짝 삐져나오게)
  at(ctx, 120, 210, -0.22, 0.9, () => propNotebook(ctx, 460, 600, rand, "lined"));     // 왼쪽 위
  at(ctx, 1880, 150, 0.28, 0.85, () => propNotebook(ctx, 420, 520, rand, "grid"));     // 오른쪽 위
  at(ctx, 1000, 1470, -0.05, 0.85, () => propNotebook(ctx, 640, 300, rand, "grid"));   // 아래 가운데
  at(ctx, 80, 1290, 0.2, 0.85, () => propNotebook(ctx, 380, 480, rand, "lined"));      // 왼쪽 아래
  at(ctx, 1935, 1240, -0.32, 0.85, () => propPhone(ctx));                              // 오른쪽 아래
}

/* ---------- 전체 ---------- */
function drawFrame(canvas, opts) {
  canvas.width = FW; canvas.height = FH;
  const ctx = canvas.getContext("2d");
  const [A, B] = opts.people;
  const story = opts.story;
  const title = opts.title || {};

  ctx.fillStyle = FC.bg;
  ctx.fillRect(0, 0, FW, FH);

  drawBackdrop(ctx, `${A.c.id}|${B.c.id}`);
  drawTitle(ctx, title.name || (story ? story.name : `${A.c.name.slice(-2)} × ${B.c.name.slice(-2)}`), story ? story.tags : [], title.colors || []);
  drawCards(ctx, story, `${A.c.id}|${B.c.id}`, [A.c, B.c]);
  drawPanel(ctx, A, 0, opts.mode, story);
  drawPanel(ctx, B, 1, opts.mode, story);

  drawDeco(ctx);

  // 종이 질감: 고운 입자(곱하기) + 살짝 구겨진 종이 같은 큰 얼룩
  paperTexture(ctx, `${A.c.id}|${B.c.id}`);
  return canvas;
}

// 틀에 쓰는 웹폰트를 미리 받아둠 (캔버스는 글꼴이 늦게 오면 기본 글꼴로 그려버림)
function loadFrameFonts(text = "") {
  if (!document.fonts) return Promise.resolve();
  const sample = "가나다라마바사아자차카타파하ABC0123456789·×" + text;
  return Promise.all([
    document.fonts.load(`80px ${FF.title}`, sample),
    document.fonts.load(`500 24px ${FF.body}`, sample),
    document.fonts.load(`600 24px ${FF.body}`, sample),
    document.fonts.load(`700 24px ${FF.body}`, sample),
    document.fonts.load(`400 32px ${FF.handBoy}`, sample),
    document.fonts.load(`400 28px ${FF.handGirl}`, sample),
  ]).catch(() => {});
}
