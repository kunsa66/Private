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
};
const PARTS = [["meet", "첫 만남"], ["some", "썸"], ["love", "연애"], ["end", "헤어짐"]];
const COLOR_SLOTS = [["hair", "머리"], ["eye", "눈"], ["point", "포인트"]];
const PANEL = { w: 530, h: 1300, y: 60, inset: 60 };

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
  const y = Math.max(minY, tailY - h - 34);
  const tx = Math.min(Math.max(tailX, x + 50), x + w - 50);
  const shape = () => {
    rrect(ctx, x, y, w, h, 30);
    ctx.moveTo(tx - 18, y + h - 1); ctx.lineTo(tailX, Math.max(tailY, y + h + 22)); ctx.lineTo(tx + 18, y + h - 1);
  };
  ctx.save();
  softShadow(ctx, 14, 4, 0.1);
  ctx.fillStyle = filled ? FC.blue : FC.card;
  shape(); ctx.fill();
  noShadow(ctx);
  if (!filled) {
    ctx.lineWidth = 3; ctx.strokeStyle = FC.blue; ctx.lineJoin = "round";
    rrect(ctx, x, y, w, h, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 18, y + h); ctx.lineTo(tailX, Math.max(tailY, y + h + 22)); ctx.lineTo(tx + 18, y + h); ctx.stroke();
    ctx.fillStyle = FC.card; ctx.fillRect(tx - 16, y + h - 4, 32, 6);
  }
  ctx.font = `700 ${size}px ${FF.body}`; ctx.textAlign = "center"; ctx.fillStyle = filled ? "#fff" : FC.blue;
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
  const bg = (P.art && P.art.img) || P.photo;
  if (bg) {
    const r = Math.max(w / bg.width, h / bg.height), sw = w / r, sh = h / r;
    ctx.globalAlpha = 0.2;
    ctx.drawImage(bg, (bg.width - sw) / 2, (bg.height - sh) * 0.15, sw, sh, x, y, w, h);
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
  cols.forEach(([k, label], i) => {
    const cx = left ? tx + 24 + i * 78 : tx - 24 - (cols.length - 1 - i) * 78, cy = y + 262;
    ctx.save();
    softShadow(ctx, 8, 2, 0.12);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = P.colors[k];
    ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.fill();
    ctx.font = `600 18px ${FF.body}`; ctx.fillStyle = FC.sub; ctx.textAlign = "center";
    ctx.fillText(label, cx, cy + 50);
  });

  // SD: 한 쌍 = 작은 SD, 두 쌍 = 길쭉한 SD + 작은 SD 스티커
  const foot = y + h - 30, mid = x + w / 2;
  let headTop, headX;
  if (mode === "two") {
    const main = P.tall || P.small;
    headX = mid + (left ? 40 : -40);
    headTop = drawFigure(ctx, main, headX, foot, P.tall ? 820 : 700, !P.tall);
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
function drawCards(ctx, story, seedKey) {
  const rand = seeded(strHash(seedKey));
  const cx0 = PANEL.inset + PANEL.w + 40, cw = FW - cx0 * 2;      // 가운데 영역
  const gap = 40, w = (cw - gap) / 2, h = 470, ys = [328, 850];
  const papers = ["lined", "grid", "lined", "dot"].sort(() => rand() - 0.5);
  const tapes = ["stripe", "gray", "plain", "white"].sort(() => rand() - 0.5);
  const placed = [];
  PARTS.forEach(([key, label], i) => {
    const text = story && story.parts ? story.parts[key] : "";
    const rot = (rand() - 0.5) * 0.07;
    const x = cx0 + (i % 2) * (w + gap) + (rand() - 0.5) * 14, y = ys[i >> 1] + (rand() - 0.5) * 16;
    const torn = rand() < 0.5 ? "top" : "bottom";
    const holes = torn === "bottom" && rand() < 0.6;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
    const paper = document.createElement("canvas");
    paper.width = Math.ceil(w); paper.height = Math.ceil(h + 12);
    const p = paper.getContext("2d");
    paperPath(p, w, h, torn, rand);
    p.fillStyle = i % 2 ? "#FDFDFB" : "#FFFFFF"; p.fill();
    p.save(); p.clip(); paperPattern(p, w, h, papers[i]); p.restore();
    if (holes) punchHoles(p, w);
    softShadow(ctx, 14, 5, 0.1);
    ctx.drawImage(paper, 0, 0);
    noShadow(ctx);
    // 제목: 숫자 + 형광펜 그은 제목
    ctx.font = `44px ${FF.title}`; ctx.textAlign = "left"; ctx.fillStyle = FC.blue;
    ctx.fillText(`0${i + 1}`, 36, 90);
    const nw = ctx.measureText(`0${i + 1}`).width;
    ctx.font = `38px ${FF.title}`;
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(150,186,240,.45)";
    ctx.fillRect(36 + nw + 12, 72, lw + 10, 18);
    ctx.fillStyle = FC.ink;
    ctx.fillText(label, 36 + nw + 16, 88);
    // 본문: 줄 노트 줄에 맞춤
    if (text) {
      const { lines, size } = fitText(ctx, text, w - 72, 8, (z) => `500 ${z}px ${FF.body}`, [25, 24, 23, 22]);
      ctx.font = `500 ${size}px ${FF.body}`; ctx.fillStyle = FC.text;
      lines.forEach((l, k) => ctx.fillText(l, 38, 142 + k * 37));
    } else {
      ctx.font = `600 26px ${FF.body}`; ctx.fillStyle = FC.sub; ctx.textAlign = "center";
      ctx.fillText("아직 썰이 없어요", w / 2, h / 2 + 30);
    }
    ctx.restore();
    placed.push({ x, y, w });
  });
  // 테이프 (한 장에 하나, 가끔 양쪽 모서리)
  placed.forEach(({ x, y, w }, i) => {
    if (rand() < 0.35) {
      drawTape(ctx, x + 22, y + 12, 110, -0.7 + rand() * 0.2, tapes[i]);
      drawTape(ctx, x + w - 22, y + 12, 110, 0.7 - rand() * 0.2, tapes[i]);
    } else {
      drawTape(ctx, x + w / 2 + (rand() - 0.5) * 90, y + 4, 140 + rand() * 30, (rand() - 0.5) * 0.35, tapes[i]);
    }
  });
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

  drawTitle(ctx, title.name || (story ? story.name : `${A.c.name.slice(-2)} × ${B.c.name.slice(-2)}`), story ? story.tags : [], title.colors || []);
  drawCards(ctx, story, `${A.c.id}|${B.c.id}`);
  drawPanel(ctx, A, 0, opts.mode, story);
  drawPanel(ctx, B, 1, opts.mode, story);

  // 스티커 몇 개
  drawStar(ctx, PANEL.inset + PANEL.w - 10, PANEL.y + 16, 34, 0.25, FC.blue, FC.ink);
  drawStar(ctx, FW - PANEL.inset - PANEL.w + 14, PANEL.y + PANEL.h - 20, 28, -0.2, "#fff", FC.ink);

  // 은은한 종이 질감
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = ctx.createPattern(noiseTile(), "repeat");
  ctx.fillRect(0, 0, FW, FH);
  ctx.restore();
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
  ]).catch(() => {});
}
