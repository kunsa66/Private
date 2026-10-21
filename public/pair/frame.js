/* =========================================================
   태풍고 틀 생성기 — 페어 틀 그리기 (2000×1560 PNG)
   파란 바탕 + 스프링 노트 + 스티커·클립·자 장식, 마지막에 종이 질감
   drawFrame(canvas, {
     mode: "one" | "two",          // 한 쌍(작은 SD) / 두 쌍(작은 + 길쭉한 SD)
     people: [P, P],                // P = { c: 캐릭터, mbti, photo: Image|null,
                                    //       small: {img, s}|null, tall: {img, s}|null, colors: [] }
     story: {...} | null            // stories.json 한 항목 (없으면 빈칸 안내)
   })
   ========================================================= */
const FW = 2000, FH = 1560;
const FC = {
  blue: "#3F7FE3", blueDeep: "#2457B8", blueMid: "#6FA0EE", blueSoft: "#A9C7F5",
  blueLight: "#CFE0FA", bluePale: "#E9F1FD", paper: "#FCFCFA", ink: "#1E2A44",
  gray: "#7C8798", doodle: "#8DB6F2", white: "#FFFFFF",
};
const FF = {
  title: '"Black Han Sans", sans-serif',
  hand: '"Gaegu", cursive',
  body: '"Pretendard Variable", Pretendard, sans-serif',
};
const PARTS = [["meet", "첫 만남"], ["some", "썸"], ["love", "연애"], ["end", "헤어짐"]];
const AGE_OF = { 1: 17, 2: 18 };

/* ---------- 도구 ---------- */
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
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function starPath(ctx, cx, cy, R, rot = 0, inner = 0.48) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * inner : R;
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    ctx[i ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
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
// 칸 안에 들어갈 때까지 글자 크기를 줄여서 줄바꿈
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

/* ---------- 바탕: 파란 종이 + 물방울 + 먼지 ---------- */
function drawBackground(ctx, rand) {
  ctx.fillStyle = FC.blue;
  ctx.fillRect(0, 0, FW, FH);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  for (let y = 18, row = 0; y < FH; y += 38, row++) {
    for (let x = row % 2 ? 37 : 18; x < FW; x += 38) {
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rand() < 0.5 ? "rgba(255,255,255,.18)" : "rgba(10,30,90,.16)";
    ctx.fillRect(rand() * FW, rand() * FH, 1 + rand() * 2.2, 1 + rand() * 2.2);
  }
}

/* ---------- 스프링 노트 ---------- */
const PAPER = { x: 56, y: 44, w: 1888, h: 1472 };
function drawPaper(ctx, rand) {
  const { x, y, w, h } = PAPER;
  // 뒤에 삐져나온 연하늘 종이 한 장
  ctx.save();
  ctx.translate(FW / 2, FH / 2); ctx.rotate(0.018); ctx.translate(-FW / 2, -FH / 2);
  ctx.fillStyle = FC.blueLight;
  ctx.shadowColor = "rgba(10,30,90,.25)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  ctx.fillRect(x + 10, y + 8, w - 4, h - 6);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(10,30,90,.32)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
  ctx.fillStyle = FC.paper;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // 줄 노트
  ctx.strokeStyle = "rgba(96,140,210,.2)";
  ctx.lineWidth = 2;
  for (let ly = 330; ly < y + h - 20; ly += 48) {
    ctx.beginPath(); ctx.moveTo(x + 70, ly); ctx.lineTo(x + w - 24, ly); ctx.stroke();
  }
  // 종이 먼지
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(60,70,90,${0.04 + rand() * 0.07})`;
    ctx.fillRect(x + rand() * w, y + rand() * h, 1.6, 1.6);
  }
  // 왼쪽 스프링 구멍 + 링
  for (let hy = y + 70; hy < y + h - 40; hy += 64) {
    ctx.fillStyle = "#3466C2";
    ctx.beginPath(); ctx.arc(x + 32, hy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#C9D3E2"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x + 12, hy - 2, 22, -0.25 * Math.PI, 0.55 * Math.PI, true); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + 12, hy - 4, 21, -0.2 * Math.PI, 0.5 * Math.PI, true); ctx.stroke();
  }
}

/* ---------- 장식 ---------- */
function drawStar(ctx, cx, cy, R, rot, fill, stroke) {
  ctx.save();
  starPath(ctx, cx, cy, R, rot);
  ctx.shadowColor = "rgba(10,30,90,.22)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = "transparent";
  if (stroke) { ctx.lineWidth = 4; ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.stroke(); }
  ctx.restore();
}
function drawRuler(ctx, cx, cy, rot) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.shadowColor = "rgba(10,30,90,.3)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.fillStyle = "rgba(169,199,245,.92)";
  rrect(ctx, -230, -36, 460, 72, 6); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(36,87,184,.7)"; ctx.lineWidth = 2.5;
  for (let i = 0; i <= 44; i++) {
    const tx = -215 + i * 10, len = i % 10 === 0 ? 26 : i % 5 === 0 ? 18 : 11;
    ctx.beginPath(); ctx.moveTo(tx, -36); ctx.lineTo(tx, -36 + len); ctx.stroke();
  }
  ctx.restore();
}
function drawBinderClip(ctx, cx, cy, rot) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.strokeStyle = "#C9D3E2"; ctx.lineWidth = 6; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-30, -52); ctx.lineTo(30, -52); ctx.lineTo(24, 0); ctx.stroke();
  ctx.shadowColor = "rgba(10,30,90,.3)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#3466C2";
  ctx.beginPath(); ctx.moveTo(-44, -6); ctx.lineTo(44, -6); ctx.lineTo(36, 34); ctx.lineTo(-36, 34); ctx.closePath(); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255,255,255,.28)";
  ctx.fillRect(-40, -2, 80, 6);
  ctx.restore();
}
function drawPaperClip(ctx, cx, cy, rot) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.strokeStyle = "#5B8EE0"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(10, 40); ctx.lineTo(10, -40); ctx.arc(-4, -40, 14, 0, Math.PI, true);
  ctx.lineTo(-18, 52); ctx.arc(-2, 52, 16, Math.PI, 0, true); ctx.lineTo(14, -24);
  ctx.stroke();
  ctx.restore();
}
function drawTape(ctx, cx, cy, w, rot, color = "rgba(169,199,245,.72)") {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -18);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-w / 2 + (i % 2 ? 5 : 0), -18 + i * 6);
  ctx.lineTo(w / 2, 18);
  for (let i = 0; i <= 6; i++) ctx.lineTo(w / 2 - (i % 2 ? 5 : 0), 18 - i * 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawSmiley(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = FC.doodle; ctx.fillStyle = FC.doodle; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    const a = -Math.PI / 2 + i * 0.32;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
    ctx.lineTo(cx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14)); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.1, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.1, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy + r * 0.4); ctx.lineTo(cx + r * 0.35, cy + r * 0.36); ctx.stroke();
  ctx.restore();
}
function doodleText(ctx, text, x, y, size, rot, align = "left") {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `700 ${size}px ${FF.hand}`;
  ctx.textAlign = align; ctx.fillStyle = FC.doodle;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/* ---------- 머리 부분: 페어명 스티커 글자 + 태그 ---------- */
function drawTitle(ctx, name, tags, rand) {
  const chars = [...String(name || "").replace(/\s+/g, "")].slice(0, 8);
  if (chars.length) {
    const pad = 30, gap = 10;
    let size = 132;
    const total = (s) => {
      ctx.font = `${s}px ${FF.title}`;
      return chars.reduce((t, ch) => t + ctx.measureText(ch).width + pad, 0) + gap * (chars.length - 1);
    };
    while (size > 60 && total(size) > 700) size -= 4;
    let x = FW / 2 - total(size) / 2;
    ctx.font = `${size}px ${FF.title}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    chars.forEach((ch, i) => {
      const w = ctx.measureText(ch).width + pad, h = size + 26;
      const cx = x + w / 2, cy = 172 + (rand() - 0.5) * 14;
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate((rand() - 0.5) * 0.2);
      ctx.shadowColor = "rgba(10,30,90,.25)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
      const dark = i % 2 === 0;
      ctx.fillStyle = dark ? FC.blue : FC.white;
      rrect(ctx, -w / 2, -h / 2, w, h, 16); ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 5; ctx.strokeStyle = dark ? FC.white : FC.blue;
      rrect(ctx, -w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 11); ctx.stroke();
      ctx.font = `${size}px ${FF.title}`;
      ctx.fillStyle = dark ? FC.white : FC.blue;
      ctx.fillText(ch, 0, 6);
      ctx.restore();
      x += w + gap;
    });
    ctx.textBaseline = "alphabetic";
  }
  const tagText = (tags || []).join("  ");
  if (tagText) {
    const s = fitWidth(ctx, tagText, 760, (z) => `700 ${z}px ${FF.hand}`, 38, 24);
    ctx.font = `700 ${s}px ${FF.hand}`;
    const tw = ctx.measureText(tagText).width;
    ctx.fillStyle = "rgba(169,199,245,.55)";
    rrect(ctx, FW / 2 - tw / 2 - 18, 268, tw + 36, s + 8, 8); ctx.fill();
    ctx.fillStyle = FC.blueDeep; ctx.textAlign = "center";
    ctx.fillText(tagText, FW / 2, 268 + s - 2);
  }
}

/* ---------- 캐릭터 이름·정보 (왼쪽 A / 오른쪽 B) ---------- */
function heightOf(c) {
  const m = [...(c.keywords || []), c.oneLiner || ""].join(" ").match(/(\d{3})\s?cm/);
  return m ? `${m[1]}cm` : "";
}
function drawNameBlock(ctx, P, side) {
  const c = P.c, left = side === 0;
  const bx = left ? 124 : FW - 124 - 84;
  ctx.save();
  ctx.shadowColor = "rgba(10,30,90,.22)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
  ctx.fillStyle = left ? FC.blue : FC.blueSoft;
  rrect(ctx, bx, 78, 84, 84, 18); ctx.fill();
  ctx.restore();
  ctx.font = `64px ${FF.title}`; ctx.textAlign = "center"; ctx.fillStyle = FC.white;
  ctx.fillText(left ? "A" : "B", bx + 42, 144);

  const nx = left ? 228 : FW - 228, align = left ? "left" : "right";
  const ns = fitWidth(ctx, c.name, 360, (z) => `${z}px ${FF.title}`, 74, 44);
  ctx.font = `${ns}px ${FF.title}`; ctx.textAlign = align; ctx.fillStyle = FC.ink;
  ctx.fillText(c.name, nx, 148);

  const info = [`${c.grade}학년`, `${AGE_OF[c.grade] || ""}세`, c.gender, P.mbti, heightOf(c)].filter(Boolean).join(" · ");
  const ix = left ? 128 : FW - 128;
  ctx.font = `600 27px ${FF.body}`; ctx.fillStyle = FC.gray;
  ctx.fillText(info, ix, 205);

  // 키워드 해시태그: 한 줄에 들어가는 만큼
  ctx.font = `700 31px ${FF.hand}`;
  let tags = "";
  for (const k of (c.keywords || []).filter((w) => !/\d{3}\s?cm/.test(w))) {
    const t = (tags ? tags + " " : "") + "#" + k.replace(/\s+/g, "_");
    if (ctx.measureText(t).width > 470) break;
    tags = t;
  }
  ctx.fillStyle = FC.blue;
  ctx.fillText(tags, ix, 250);
}

/* ---------- 폴라로이드 두상 ---------- */
function drawPolaroid(ctx, P, cx, cy, rot, side) {
  const W = 300, H = 380, PW = 268, PH = 300;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  ctx.shadowColor = "rgba(10,30,90,.28)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 9;
  ctx.fillStyle = FC.white;
  ctx.fillRect(-W / 2, -H / 2, W, H);
  ctx.shadowColor = "transparent";
  const px = -PW / 2, py = -H / 2 + 16;
  ctx.fillStyle = FC.bluePale;
  ctx.fillRect(px, py, PW, PH);
  if (P.photo) {
    const img = P.photo, r = Math.max(PW / img.width, PH / img.height);
    const sw = PW / r, sh = PH / r;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, px, py, PW, PH);
  }
  ctx.font = `700 34px ${FF.hand}`; ctx.textAlign = "center"; ctx.fillStyle = FC.ink;
  ctx.fillText(`${P.c.name} ${side === 0 ? "♡" : "☆"}`, 0, H / 2 - 22);
  ctx.restore();
  if (side === 0) drawBinderClip(ctx, cx - 10, cy - H / 2 + 6, rot);
  else drawTape(ctx, cx + 8, cy - H / 2 + 4, 150, rot - 0.06);
}

function drawSwatches(ctx, colors, cx, cy) {
  const list = (colors || []).slice(0, 3);
  list.forEach((col, i) => {
    const x = cx + (i - (list.length - 1) / 2) * 66;
    ctx.save();
    ctx.shadowColor = "rgba(10,30,90,.22)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    ctx.fillStyle = FC.white;
    ctx.beginPath(); ctx.arc(x, cy, 28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, cy, 22, 0, Math.PI * 2); ctx.fill();
  });
}

/* ---------- 메모지: A가 B를 보는 시선 ---------- */
function drawNote(ctx, x, y, w, h, title, text, tone) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tone ? 0.012 : -0.012); ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = "rgba(10,30,90,.18)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5;
  ctx.fillStyle = tone ? FC.blueLight : FC.bluePale;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h - 34); ctx.lineTo(w - 34, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(36,87,184,.14)";
  ctx.beginPath(); ctx.moveTo(w, h - 34); ctx.lineTo(w - 34, h - 34); ctx.lineTo(w - 34, h); ctx.closePath(); ctx.fill();
  ctx.font = `700 31px ${FF.hand}`; ctx.textAlign = "left"; ctx.fillStyle = FC.blueDeep;
  ctx.fillText(title, 24, 46);
  const { lines, size } = fitText(ctx, text, w - 48, 3, (z) => `500 ${z}px ${FF.body}`, [24, 22, 20]);
  ctx.fillStyle = FC.ink;
  lines.forEach((l, i) => ctx.fillText(l, 24, 92 + i * (size + 12)));
  ctx.restore();
}

/* ---------- SD 캐릭터: 흰 테두리 스티커처럼, 발끝을 바닥선에 맞춤 ---------- */
function outlined(img, w, h, pad) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(h + pad * 2);
  const x = c.getContext("2d");
  const sil = document.createElement("canvas");
  sil.width = c.width; sil.height = c.height;
  const sx = sil.getContext("2d");
  sx.drawImage(img, pad, pad, w, h);
  sx.globalCompositeOperation = "source-in";
  sx.fillStyle = FC.white; sx.fillRect(0, 0, sil.width, sil.height);
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
function drawShadow(ctx, cx, footY, w) {
  ctx.fillStyle = "rgba(36,87,184,.13)";
  ctx.beginPath(); ctx.ellipse(cx, footY + 2, Math.max(70, w * 0.42), 18, 0, 0, Math.PI * 2); ctx.fill();
}
function drawFigure(ctx, fig, cx, footY, targetH, kind) {
  if (!fig) {
    // 이미지가 없으면 연한 실루엣
    const h = targetH, chibi = kind === "small";
    const hr = chibi ? h * 0.24 : h * 0.12;
    drawShadow(ctx, cx, footY, chibi ? h * 0.5 : h * 0.4);
    ctx.fillStyle = "#D6E0F0";
    ctx.beginPath(); ctx.arc(cx, footY - h + hr, hr, 0, Math.PI * 2); ctx.fill();
    const bodyTop = footY - h + hr * 2 - 6, bw = chibi ? hr * 1.3 : hr * 1.9;
    rrect(ctx, cx - bw / 2, bodyTop, bw, footY - bodyTop, bw * 0.3); ctx.fill();
    return;
  }
  const { w, h } = figureSize(fig, targetH);
  drawShadow(ctx, cx, footY, w);
  const pad = 9;
  ctx.drawImage(outlined(fig.img, w, h, pad), cx - w / 2 - pad, footY - h - pad);
}

/* ---------- 말풍선 ---------- */
function drawBubble(ctx, text, x, y, w, tailX, tailY, dark) {
  if (!text) return;
  const { lines, size } = fitText(ctx, text, w - 44, 2, (z) => `700 ${z}px ${FF.hand}`, [34, 31, 28, 25]);
  const lh = size + 6, h = lines.length * lh + 34;
  ctx.save();
  ctx.shadowColor = "rgba(10,30,90,.22)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = dark ? FC.blue : FC.white;
  rrect(ctx, x, y, w, h, 22); ctx.fill();
  const bx = Math.min(Math.max(tailX, x + 40), x + w - 40);
  ctx.beginPath(); ctx.moveTo(bx - 16, y + h - 2); ctx.lineTo(tailX, Math.max(tailY, y + h + 20)); ctx.lineTo(bx + 16, y + h - 2); ctx.closePath(); ctx.fill();
  ctx.shadowColor = "transparent";
  if (!dark) { ctx.lineWidth = 4; ctx.strokeStyle = FC.blue; rrect(ctx, x, y, w, h, 22); ctx.stroke(); }
  ctx.font = `700 ${size}px ${FF.hand}`; ctx.textAlign = "center"; ctx.fillStyle = dark ? FC.white : FC.ink;
  lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 17 + size - 4 + i * lh));
  ctx.restore();
}

/* ---------- 썰 카드 네 장 ---------- */
function drawCards(ctx, story, rand) {
  const x0 = 124, y = 1092, h = 372, gap = 46;
  const w = (FW - x0 * 2 - gap * 3) / 4;
  PARTS.forEach(([key, label], i) => {
    const x = x0 + i * (w + gap);
    const text = story ? story.parts && story.parts[key] : "";
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rand() - 0.5) * 0.024); ctx.translate(-w / 2, -h / 2);
    ctx.shadowColor = "rgba(10,30,90,.2)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    ctx.fillStyle = i % 2 ? FC.bluePale : FC.white;
    rrect(ctx, 0, 0, w, h, 14); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 3; ctx.strokeStyle = FC.blueLight;
    rrect(ctx, 0, 0, w, h, 14); ctx.stroke();
    ctx.font = `46px ${FF.title}`; ctx.textAlign = "left"; ctx.fillStyle = FC.blue;
    ctx.fillText(`0${i + 1}`, 26, 76);
    const nw = ctx.measureText(`0${i + 1}`).width;
    ctx.font = `700 40px ${FF.hand}`; ctx.fillStyle = FC.ink;
    ctx.fillText(label, 26 + nw + 14, 74);
    ctx.setLineDash([8, 8]); ctx.strokeStyle = FC.blueSoft; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(24, 98); ctx.lineTo(w - 24, 98); ctx.stroke();
    ctx.setLineDash([]);
    if (text) {
      const { lines, size } = fitText(ctx, text, w - 52, 7, (z) => `500 ${z}px ${FF.body}`, [25, 24, 23, 22, 21]);
      ctx.fillStyle = FC.ink;
      lines.forEach((l, k) => ctx.fillText(l, 26, 142 + k * (size + 13)));
    } else {
      ctx.font = `700 30px ${FF.hand}`; ctx.fillStyle = FC.gray; ctx.textAlign = "center";
      ctx.fillText("아직 썰이 없어요", w / 2, h / 2 + 30);
    }
    ctx.restore();
    drawTape(ctx, x + w / 2 + (rand() - 0.5) * 60, y + 2, 120, (rand() - 0.5) * 0.3);
    if (i < 3) {
      const ax = x + w + gap / 2, ay = y + h / 2;
      ctx.fillStyle = FC.blue;
      ctx.beginPath(); ctx.moveTo(ax - 9, ay - 15); ctx.lineTo(ax + 11, ay); ctx.lineTo(ax - 9, ay + 15); ctx.closePath(); ctx.fill();
    }
  });
}

/* ---------- 전체 ---------- */
function drawFrame(canvas, opts) {
  canvas.width = FW; canvas.height = FH;
  const ctx = canvas.getContext("2d");
  const [A, B] = opts.people;
  const story = opts.story;
  const rand = seeded(strHash(`${A.c.id}|${B.c.id}`));

  drawBackground(ctx, rand);
  drawPaper(ctx, rand);

  // 낙서
  doodleText(ctx, "123", 150, 360, 50, -0.12);
  drawSmiley(ctx, 505, 350, 30);
  doodleText(ctx, "ABC", FW - 150, 360, 50, 0.1, "right");
  doodleText(ctx, "♪", 1490, 368, 58, -0.15);

  drawTitle(ctx, story ? story.name : `${A.c.name.slice(-2)}${B.c.name.slice(-2)}`, story ? story.tags : ["#썰_대기중"], rand);
  drawNameBlock(ctx, A, 0);
  drawNameBlock(ctx, B, 1);

  // 양쪽 기둥: 폴라로이드 → 색 → 메모
  drawPolaroid(ctx, A, 342, 604, -0.045, 0);
  drawPolaroid(ctx, B, FW - 342, 604, 0.045, 1);
  drawSwatches(ctx, A.colors, 342, 838);
  drawSwatches(ctx, B.colors, FW - 342, 838);
  const vA = story && story.views ? story.views[A.c.id] : "";
  const vB = story && story.views ? story.views[B.c.id] : "";
  drawNote(ctx, 124, 878, 440, 192, `${A.c.name} → ${B.c.name}`, vA || "썰이 들어오면 여기에 채워져요.", 0);
  drawNote(ctx, FW - 124 - 440, 878, 440, 192, `${B.c.name} → ${A.c.name}`, vB || "썰이 들어오면 여기에 채워져요.", 1);

  // 가운데: SD
  const FOOT = 1050;
  let heads;
  if (opts.mode === "two") {
    const TALL = 600, SMALL = 370;
    const tA = A.tall, tB = B.tall;
    drawFigure(ctx, tA, 872, FOOT - 8, TALL, "tall");
    drawFigure(ctx, tB, 1128, FOOT - 8, TALL, "tall");
    drawFigure(ctx, A.small, 676, FOOT + 6, SMALL, "small");
    drawFigure(ctx, B.small, 1324, FOOT + 6, SMALL, "small");
    const top = (f) => FOOT - 8 - (f ? figureSize(f, TALL).h : TALL);
    heads = [[872, top(tA)], [1128, top(tB)]];
  } else {
    const SMALL = 590;
    drawFigure(ctx, A.small, 818, FOOT, SMALL, "small");
    drawFigure(ctx, B.small, 1182, FOOT, SMALL, "small");
    const top = (f) => FOOT - (f ? figureSize(f, SMALL).h : SMALL);
    heads = [[818, top(A.small)], [1182, top(B.small)]];
  }
  if (story && story.lines) {
    drawBubble(ctx, story.lines[A.c.id], 596, 312, 384, heads[0][0] - 30, heads[0][1] + 10, true);
    drawBubble(ctx, story.lines[B.c.id], 1020, 312, 384, heads[1][0] + 30, heads[1][1] + 10, false);
  }

  drawCards(ctx, story, rand);

  // 큰 장식 (가장자리 위주)
  drawStar(ctx, 64, 58, 50, -0.2, FC.white, FC.blueSoft);
  drawStar(ctx, 118, 112, 22, 0.3, FC.blueSoft);
  drawStar(ctx, FW - 46, 470, 30, 0.25, FC.white);
  drawStar(ctx, 34, 1300, 40, 0.1, FC.blueSoft, FC.white);
  drawStar(ctx, 980, 1528, 24, -0.3, FC.white);
  drawPaperClip(ctx, 1296, 52, 0.2);
  drawRuler(ctx, 1900, 1520, -0.42);

  ctx.font = `700 26px ${FF.hand}`; ctx.textAlign = "right"; ctx.fillStyle = FC.gray;
  ctx.fillText("태풍고 틀 생성기", FW - 330, 1500);

  // 종이 질감 오버레이
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = ctx.createPattern(noiseTile(), "repeat");
  ctx.fillRect(0, 0, FW, FH);
  ctx.restore();
  return canvas;
}

// 틀에 쓰는 웹폰트를 미리 받아둠 (캔버스는 글꼴이 늦게 오면 기본 글꼴로 그려버림)
function loadFrameFonts(text = "") {
  if (!document.fonts) return Promise.resolve();
  const sample = "가나다라마바사아자차카타파하ABC123♪♡☆→" + text;
  return Promise.all([
    document.fonts.load(`80px ${FF.title}`, sample),
    document.fonts.load(`700 30px ${FF.hand}`, sample),
    document.fonts.load(`500 24px ${FF.body}`, sample),
    document.fonts.load(`600 24px ${FF.body}`, sample),
  ]).catch(() => {});
}
