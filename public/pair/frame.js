/* =========================================================
   태풍고 틀 생성기 — 페어 틀 그리기 (2000×1420 PNG)
   흰색·연회색 바탕 + 파란 포인트. 키치는 통통한 제목 글씨·반짝이·종이 질감 정도만
   drawFrame(canvas, {
     mode: "one" | "two",          // 한 쌍(작은 SD) / 두 쌍(작은 + 길쭉한 SD)
     people: [P, P],                // P = { c: 캐릭터, mbti, photo: Image|null,
                                    //       small: {img, s}|null, tall: {img, s}|null,
                                    //       colors: { hair, eye, point } }
     story: {...} | null            // stories.json 한 항목 (없으면 빈칸 안내)
   })
   ========================================================= */
const FW = 2000, FH = 1420;
const FC = {
  bg: "#F1F2F4", card: "#FFFFFF", line: "#E4E7EC", faint: "#E3E6EB",
  ink: "#23272F", text: "#4B5260", sub: "#8A919C",
  blue: "#3B7BE6", blueSoft: "#E3EDFC", floor: "#E2E5EA", empty: "#DADEE5",
};
const FF = {
  title: '"Black Han Sans", sans-serif',
  body: '"Pretendard Variable", Pretendard, sans-serif',
};
const PARTS = [["meet", "첫 만남"], ["some", "썸"], ["love", "연애"], ["end", "헤어짐"]];
const COLOR_SLOTS = [["hair", "머리"], ["eye", "눈"], ["point", "포인트"]];

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
// 네 갈래 반짝이 ✦
function sparkle(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fillStyle = color; ctx.fill();
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

/* ---------- 머리: 페어명 + 태그 ---------- */
function drawTitle(ctx, name, tags) {
  const text = String(name || "").trim();
  const s = fitWidth(ctx, text, 720, (z) => `${z}px ${FF.title}`, 132, 70);
  ctx.font = `${s}px ${FF.title}`; ctx.textAlign = "center"; ctx.fillStyle = FC.ink;
  ctx.fillText(text, FW / 2, 182);
  const half = ctx.measureText(text).width / 2;
  sparkle(ctx, FW / 2 + half + 34, 78, 22, FC.blue);
  sparkle(ctx, FW / 2 + half + 64, 116, 11, FC.blue);
  sparkle(ctx, FW / 2 - half - 30, 168, 14, FC.blue);

  const list = (tags || []).filter(Boolean).slice(0, 4);
  if (!list.length) return;
  ctx.font = `700 27px ${FF.body}`;
  const pads = list.map((t) => ctx.measureText(t).width + 40);
  const total = pads.reduce((a, b) => a + b, 0) + 12 * (list.length - 1);
  let x = FW / 2 - total / 2;
  list.forEach((t, i) => {
    ctx.fillStyle = FC.blueSoft;
    rrect(ctx, x, 214, pads[i], 50, 25); ctx.fill();
    ctx.fillStyle = FC.blue; ctx.textAlign = "center";
    ctx.fillText(t, x + pads[i] / 2, 248);
    x += pads[i] + 12;
  });
}

/* ---------- 이름 (왼쪽 A / 오른쪽 B) ---------- */
function drawName(ctx, P, side) {
  const left = side === 0;
  ctx.font = `300px ${FF.title}`; ctx.fillStyle = FC.faint;
  ctx.textAlign = left ? "left" : "right";
  ctx.fillText(left ? "A" : "B", left ? 72 : FW - 72, 290);

  const x = left ? 116 : FW - 116;
  const s = fitWidth(ctx, P.c.name, 440, (z) => `${z}px ${FF.title}`, 86, 50);
  ctx.font = `${s}px ${FF.title}`; ctx.fillStyle = FC.ink;
  ctx.fillText(P.c.name, x, 176);
  ctx.font = `600 29px ${FF.body}`; ctx.fillStyle = FC.sub;
  ctx.fillText([`${P.c.grade}학년`, P.mbti].filter(Boolean).join(" · "), x, 228);
}

/* ---------- 두상 카드 ---------- */
function drawHead(ctx, P, x, y, w, h) {
  ctx.save();
  softShadow(ctx);
  ctx.fillStyle = FC.card;
  rrect(ctx, x, y, w, h, 30); ctx.fill();
  noShadow(ctx);
  rrect(ctx, x + 10, y + 10, w - 20, h - 20, 22); ctx.clip();
  ctx.fillStyle = FC.bg; ctx.fillRect(x, y, w, h);
  if (P.photo) {
    const img = P.photo, iw = w - 20, ih = h - 20, r = Math.max(iw / img.width, ih / img.height);
    const sw = iw / r, sh = ih / r;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.3, sw, sh, x + 10, y + 10, iw, ih);
  }
  ctx.restore();
}

/* ---------- 색상 칩: 머리 · 눈 · 포인트 ---------- */
function drawColors(ctx, colors, x, y, side) {
  const list = COLOR_SLOTS.filter(([k]) => colors && colors[k]);
  if (!list.length) return;
  const size = 88, gap = 22, total = list.length * size + (list.length - 1) * gap;
  let cx = side === 0 ? x : x - total;
  list.forEach(([k, label]) => {
    ctx.save();
    softShadow(ctx, 14, 4, 0.08);
    ctx.fillStyle = FC.card;
    rrect(ctx, cx, y, size, size, 22); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = colors[k];
    rrect(ctx, cx + 7, y + 7, size - 14, size - 14, 16); ctx.fill();
    ctx.restore();
    ctx.font = `600 23px ${FF.body}`; ctx.fillStyle = FC.sub; ctx.textAlign = "center";
    ctx.fillText(label, cx + size / 2, y + size + 31);
    cx += size + gap;
  });
}

/* ---------- 말풍선 (옆 기둥에서 가운데 SD 쪽으로) ---------- */
function drawBubble(ctx, text, x, y, w, side) {
  if (!text) return;
  const { lines, size } = fitText(ctx, text, w - 56, 2, (z) => `700 ${z}px ${FF.body}`, [30, 28, 26, 24]);
  const lh = size + 10, h = lines.length * lh + 40;
  const filled = side === 0;
  ctx.save();
  softShadow(ctx, 16, 4, 0.08);
  ctx.fillStyle = filled ? FC.blue : FC.card;
  rrect(ctx, x, y, w, h, 26); ctx.fill();
  // 꼬리: 가운데(SD) 쪽 옆구리
  const my = y + h / 2;
  ctx.beginPath();
  if (side === 0) { ctx.moveTo(x + w - 2, my - 16); ctx.lineTo(x + w + 26, my + 4); ctx.lineTo(x + w - 2, my + 14); }
  else { ctx.moveTo(x + 2, my - 16); ctx.lineTo(x - 26, my + 4); ctx.lineTo(x + 2, my + 14); }
  ctx.closePath(); ctx.fill();
  noShadow(ctx);
  if (!filled) {
    ctx.lineWidth = 3; ctx.strokeStyle = FC.blue;
    rrect(ctx, x, y, w, h, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, my - 16); ctx.lineTo(x - 26, my + 4); ctx.lineTo(x, my + 14); ctx.stroke();
    ctx.fillStyle = FC.card; ctx.fillRect(x - 2, my - 14, 5, 26);
  }
  ctx.font = `700 ${size}px ${FF.body}`; ctx.textAlign = "center"; ctx.fillStyle = filled ? "#fff" : FC.blue;
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 20 + size - 2 + i * lh));
  ctx.restore();
}

/* ---------- SD: 흰 테두리, 발끝을 바닥선에 맞춤 ---------- */
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
function drawFloor(ctx, cx, footY, w) {
  ctx.fillStyle = FC.floor;
  ctx.beginPath(); ctx.ellipse(cx, footY + 2, Math.max(80, w * 0.44), 20, 0, 0, Math.PI * 2); ctx.fill();
}
function drawFigure(ctx, fig, cx, footY, targetH, kind) {
  if (!fig) {
    const h = targetH, chibi = kind === "small";
    const hr = chibi ? h * 0.24 : h * 0.12;
    drawFloor(ctx, cx, footY, chibi ? h * 0.5 : h * 0.4);
    ctx.fillStyle = FC.empty;
    ctx.beginPath(); ctx.arc(cx, footY - h + hr, hr, 0, Math.PI * 2); ctx.fill();
    const top = footY - h + hr * 2 - 6, bw = chibi ? hr * 1.3 : hr * 1.9;
    rrect(ctx, cx - bw / 2, top, bw, footY - top, bw * 0.3); ctx.fill();
    return;
  }
  const { w, h } = figureSize(fig, targetH);
  drawFloor(ctx, cx, footY, w);
  const pad = 7;
  ctx.drawImage(outlined(fig.img, w, h, pad), cx - w / 2 - pad, footY - h - pad);
}

/* ---------- 썰 카드 네 장 ---------- */
function drawCards(ctx, story) {
  const x0 = 90, y = 1004, h = 352, gap = 36;
  const w = (FW - x0 * 2 - gap * 3) / 4;
  PARTS.forEach(([key, label], i) => {
    const x = x0 + i * (w + gap);
    const text = story && story.parts ? story.parts[key] : "";
    ctx.save();
    softShadow(ctx, 22, 6, 0.06);
    ctx.fillStyle = FC.card;
    rrect(ctx, x, y, w, h, 26); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = FC.blue;
    ctx.beginPath(); ctx.arc(x + 52, y + 56, 24, 0, Math.PI * 2); ctx.fill();
    ctx.font = `800 26px ${FF.body}`; ctx.textAlign = "center"; ctx.fillStyle = "#fff";
    ctx.fillText(String(i + 1), x + 52, y + 65);
    ctx.font = `40px ${FF.title}`; ctx.textAlign = "left"; ctx.fillStyle = FC.ink;
    ctx.fillText(label, x + 92, y + 71);
    ctx.fillStyle = FC.line; ctx.fillRect(x + 28, y + 106, w - 56, 2);
    if (text) {
      const { lines, size } = fitText(ctx, text, w - 60, 6, (z) => `500 ${z}px ${FF.body}`, [25, 24, 23, 22]);
      ctx.fillStyle = FC.text;
      lines.forEach((l, k) => ctx.fillText(l, x + 30, y + 152 + k * (size + 13)));
    } else {
      ctx.font = `600 26px ${FF.body}`; ctx.fillStyle = FC.sub; ctx.textAlign = "center";
      ctx.fillText("아직 썰이 없어요", x + w / 2, y + h / 2 + 40);
    }
    ctx.restore();
    if (i < 3) {
      const ax = x + w + gap / 2, ay = y + h / 2;
      ctx.strokeStyle = FC.blue; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(ax - 6, ay - 11); ctx.lineTo(ax + 5, ay); ctx.lineTo(ax - 6, ay + 11); ctx.stroke();
    }
  });
}

/* ---------- 전체 ---------- */
function drawFrame(canvas, opts) {
  canvas.width = FW; canvas.height = FH;
  const ctx = canvas.getContext("2d");
  const [A, B] = opts.people;
  const story = opts.story;

  ctx.fillStyle = FC.bg;
  ctx.fillRect(0, 0, FW, FH);

  drawName(ctx, A, 0);
  drawName(ctx, B, 1);
  drawTitle(ctx, story ? story.name : `${A.c.name.slice(-2)} × ${B.c.name.slice(-2)}`, story ? story.tags : []);

  // 양쪽 기둥: 두상 → 색 → 대사
  drawHead(ctx, A, 110, 296, 400, 400);
  drawHead(ctx, B, FW - 510, 296, 400, 400);
  drawColors(ctx, A.colors, 110, 722, 0);
  drawColors(ctx, B.colors, FW - 110, 722, 1);
  if (story && story.lines) {
    drawBubble(ctx, story.lines[A.c.id], 110, 870, 420, 0);
    drawBubble(ctx, story.lines[B.c.id], FW - 530, 870, 420, 1);
  }

  // 가운데: SD
  const FOOT = 952;
  if (opts.mode === "two") {
    drawFigure(ctx, A.tall, 880, FOOT - 10, 640, "tall");
    drawFigure(ctx, B.tall, 1120, FOOT - 10, 640, "tall");
    drawFigure(ctx, A.small, 664, FOOT + 4, 380, "small");
    drawFigure(ctx, B.small, 1336, FOOT + 4, 380, "small");
  } else {
    drawFigure(ctx, A.small, 812, FOOT, 600, "small");
    drawFigure(ctx, B.small, 1188, FOOT, 600, "small");
  }

  drawCards(ctx, story);

  ctx.font = `600 21px ${FF.body}`; ctx.textAlign = "right"; ctx.fillStyle = "#B4BAC4";
  ctx.fillText("태풍고 틀 생성기", FW - 92, 1396);
  sparkle(ctx, FW - 296, 1389, 9, FC.blue);

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
  const sample = "가나다라마바사아자차카타파하ABC123·×" + text;
  return Promise.all([
    document.fonts.load(`80px ${FF.title}`, sample),
    document.fonts.load(`500 24px ${FF.body}`, sample),
    document.fonts.load(`700 24px ${FF.body}`, sample),
  ]).catch(() => {});
}
