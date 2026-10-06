/* 부적 카드 PNG 생성 (1080×1920)
   나중에 틀 PNG가 오면 CARD_TEMPLATE에 경로를 넣고 LAYOUT 좌표만 맞추면 됩니다. */

const CARD_TEMPLATE = { best: "", worst: "" }; // 예: "templates/best.png"

const LAYOUT = {
  W: 1080, H: 1920,
  paper: { x: 90, y: 90, w: 900, h: 1740 },
  heart: { top: 610, w: 700, h: 690 },
  photoL: { x: 402, y: 872, w: 220, h: 293, rot: -5 },
  photoR: { x: 678, y: 896, w: 220, h: 293, rot: 5 },
  stamp: { x: 540, y: 890, size: 92 },
  reason: { x: 170, y: 1380, w: 740, h: 200 },
};

// 팔레트: Dark #372E19 · Cream #FFE9B5 · Pink #F35A91 · Light Pink #FFBDDC · Plum #564147 · Mauve #BEA5AB
const P = { dark: "#372E19", cream: "#FFE9B5", pink: "#F35A91", pinkLight: "#FFBDDC", plum: "#564147", mauve: "#BEA5AB", white: "#FFFBF2" };
// 최고 = 크림 종이 + 핑크 먹, 최악 = 모브 종이 + 다크 브라운 먹
const THEME = {
  best: { paper: P.cream, ink: P.pink, text: P.plum, stamp: "緣" },
  worst: { paper: P.mauve, ink: P.dark, text: P.dark, stamp: "剋" },
};
const F_TITLE = '"Hahmlet", serif';
const F_BOLD = '"Noto Serif TC", "LXGW WenKai TC", serif';

function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

function bigHeartPath(ctx, cx, top, w, h) {
  const x = cx - w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, top + h * 0.26);
  ctx.bezierCurveTo(cx - w * 0.05, top - h * 0.04, x, top - h * 0.02, x, top + h * 0.3);
  ctx.bezierCurveTo(x, top + h * 0.58, cx - w * 0.18, top + h * 0.78, cx, top + h);
  ctx.bezierCurveTo(cx + w * 0.18, top + h * 0.78, cx + w / 2, top + h * 0.58, cx + w / 2, top + h * 0.3);
  ctx.bezierCurveTo(cx + w / 2, top - h * 0.02, cx + w * 0.05, top - h * 0.04, cx, top + h * 0.26);
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 띄어쓰기 기준으로 자르되, 두 줄이면 길이가 비슷하게 나눔 (한 글자 남는 줄 방지)
function wrapText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return [text];
  const parts = text.split(" + ");
  if (parts.length === 2 && parts.every((p) => ctx.measureText(p + " +").width <= maxW)) return [`${parts[0]} +`, parts[1]];
  const words = text.split(" ");
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");
    const m = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (m <= maxW && (!best || m < best.m)) best = { m, lines: [a, b] };
  }
  if (best) return best.lines;
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxW) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function spaced(ctx, text, x, y, gap) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + gap; });
  ctx.textAlign = "center";
}

function vertical(ctx, text, x, y, step) {
  [...text].forEach((c, i) => ctx.fillText(c, x, y + i * step));
}

// 배경 패턴: 같은 크기의 아주 얇은 하트 선, 연한 흰색 한 가지
function drawPattern(ctx) {
  const { W, H } = LAYOUT;
  const gap = 96, s = 34;
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 1.2;
  ctx.lineJoin = "round";
  for (let row = 0, y = 40; y < H + gap; row++, y += gap * 0.8) {
    for (let x = (row % 2) * (gap / 2) + 20; x < W + gap; x += gap) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(row % 2 ? 0.14 : -0.14);
      const k = s / 30;
      ctx.beginPath();
      ctx.moveTo(0, -6 * k);
      ctx.bezierCurveTo(-3 * k, -14 * k, -16 * k, -12 * k, -14 * k, -2 * k);
      ctx.bezierCurveTo(-12 * k, 6 * k, -4 * k, 10 * k, 0, 16 * k);
      ctx.bezierCurveTo(4 * k, 10 * k, 12 * k, 6 * k, 14 * k, -2 * k);
      ctx.bezierCurveTo(16 * k, -12 * k, 3 * k, -14 * k, 0, -6 * k);
      ctx.stroke();
      ctx.restore();
    }
  }
}
// 낙관(도장). 종이색 글씨, 안쪽 테두리 한 줄
function drawSeal(ctx, x, y, size, rot, color, textColor, lines, round) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  if (round) { ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, Math.PI * 2); }
  else roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.08);
  ctx.fill();
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 2;
  if (round) { ctx.beginPath(); ctx.arc(0, 0, size / 2 - 7, 0, Math.PI * 2); }
  else roundRect(ctx, -size / 2 + 7, -size / 2 + 7, size - 14, size - 14, size * 0.05);
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // 서체마다 middle 기준이 달라 글자가 아래로 쏠리므로, 실제 글자 높이로 가운데 맞춤
  lines.forEach(([text, font, dy]) => {
    ctx.font = font;
    const m = ctx.measureText(text);
    ctx.fillText(text, 0, dy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  });
  ctx.restore();
}

function drawBackground(ctx, kind, info) {
  const { W, H } = LAYOUT;
  const t = THEME[kind];
  const best = kind === "best";
  const pp = LAYOUT.paper;

  ctx.fillStyle = P.dark;
  ctx.fillRect(0, 0, W, H);
  drawPattern(ctx);

  // 부적 종이
  ctx.fillStyle = t.paper;
  ctx.fillRect(pp.x, pp.y, pp.w, pp.h);
  ctx.strokeStyle = t.ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(pp.x + 24, pp.y + 24, pp.w - 48, pp.h - 48);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pp.x + 38, pp.y + 38, pp.w - 76, pp.h - 76);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 상단 발행처
  ctx.fillStyle = t.text;
  ctx.font = `700 28px ${F_BOLD}`;
  spaced(ctx, SITE.titleHanja, W / 2, 178, 14);

  // 구간 제목: 종이 폭에 맞춰 최대한 크게
  let size = 200;
  ctx.font = `900 ${size}px ${F_BOLD}`;
  while (ctx.measureText(info.tier.hanja).width + 3 * 10 > 780 && size > 120) {
    size -= 4;
    ctx.font = `900 ${size}px ${F_BOLD}`;
  }
  ctx.fillStyle = t.ink;
  spaced(ctx, info.tier.hanja, W / 2, 338, 10);

  // 부제 (양옆 짧은 선)
  ctx.fillStyle = t.text;
  ctx.font = `700 28px ${F_TITLE}`;
  spaced(ctx, `${info.tier.ko} · ${info.tier.fuKo}`, W / 2, 486, 8);
  ctx.strokeStyle = t.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 300, 486); ctx.lineTo(W / 2 - 200, 486);
  ctx.moveTo(W / 2 + 200, 486); ctx.lineTo(W / 2 + 300, 486);
  ctx.stroke();

  // 양옆 세로 주문 (작고 단정하게)
  ctx.fillStyle = t.ink;
  ctx.font = `700 30px ${F_BOLD}`;
  vertical(ctx, "勅令急急如律令", 164, 660, 44);
  vertical(ctx, `${best ? "百年同樂" : "惡緣退散"}　${info.tier.fu}`, W - 164, 660, 44);

  // 하트 (가는 먹선 두 줄)
  const { top, w, h } = LAYOUT.heart;
  bigHeartPath(ctx, W / 2, top, w, h);
  ctx.lineWidth = 5;
  ctx.strokeStyle = t.ink;
  ctx.stroke();
  bigHeartPath(ctx, W / 2, top + 16, w - 32, h - 32);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!best) {
    // 금 간 하트 (사진 위아래로만 보이게)
    const zig = [[540, top + h * 0.26], [522, 760], [556, 820], [520, 1180], [556, 1240], [540, top + h]];
    ctx.beginPath();
    zig.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = 5;
    ctx.strokeStyle = t.ink;
    ctx.stroke();
  }

  // 하단 발행 정보
  ctx.strokeStyle = t.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pp.x + 80, 1652); ctx.lineTo(pp.x + pp.w - 80, 1652);
  ctx.stroke();
  ctx.fillStyle = t.text;
  ctx.textAlign = "left";
  ctx.font = `700 28px ${F_TITLE}`;
  ctx.fillText("태풍고 폐미부 발행", pp.x + 90, 1718);
  ctx.font = `700 24px ${F_BOLD}`;
  ctx.fillText(`符 第${info.serial}號`, pp.x + 90, 1760);
  ctx.textAlign = "center";
  drawSeal(ctx, pp.x + pp.w - 150, 1736, 112, -0.1, t.ink, t.paper, [["發", `900 34px ${F_BOLD}`, -18], ["行", `900 34px ${F_BOLD}`, 18]], true);
}

async function drawPhoto(ctx, ch, box, t) {
  const img = await loadImage(ch.photo);
  ctx.save();
  ctx.translate(box.x, box.y);
  ctx.rotate(((box.rot || 0) * Math.PI) / 180);
  const x = -box.w / 2, y = -box.h / 2;
  ctx.fillStyle = P.white;
  ctx.fillRect(x - 10, y - 10, box.w + 20, box.h + 20);
  ctx.strokeStyle = t.ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 10, y - 10, box.w + 20, box.h + 20);
  ctx.beginPath();
  ctx.rect(x, y, box.w, box.h);
  ctx.clip();
  if (img) {
    const s = Math.max(box.w / img.width, box.h / img.height);
    ctx.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s);
  } else {
    ctx.fillStyle = P.mauve;
    ctx.fillRect(x, y, box.w, box.h);
    ctx.fillStyle = P.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 110px ${F_TITLE}`;
    ctx.fillText(ch.name.slice(-1), 0, 0);
  }
  ctx.restore();
}
function drawName(ctx, ch, x, y, t) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = t.text;
  ctx.font = `800 40px ${F_TITLE}`;
  ctx.fillText(ch.name, x, y);
  ctx.font = `700 20px ${F_TITLE}`;
  ctx.fillText(`${ch.grade}학년`, x, y + 40);
}

async function makeCard(kind, A, r, info) {
  const B = r.partner;
  const t = THEME[kind];
  // 웹폰트는 글자 단위로 쪼개 받아지므로, 그릴 글자를 미리 전부 불러옴
  const korean = [A.name, B.name, info.short, info.tier.ko, info.tier.fuKo, "태풍고 폐미부 발행 학년 · 0123456789"].join("");
  const hanja = `${SITE.titleHanja}勅令急如律百年同樂惡緣退散點神託發行第號符剋${info.tier.hanja}${info.tier.fu}0123456789`;
  await Promise.all([
    document.fonts.load(`800 40px ${F_TITLE}`, korean),
    document.fonts.load(`700 28px ${F_TITLE}`, korean),
    document.fonts.load(`900 190px ${F_BOLD}`, hanja),
    document.fonts.load(`700 28px ${F_BOLD}`, hanja),
  ]).catch(() => {});

  const { W, H } = LAYOUT;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");

  const tpl = await loadImage(CARD_TEMPLATE[kind]);
  if (tpl) ctx.drawImage(tpl, 0, 0, W, H);
  else drawBackground(ctx, kind, info);

  await drawPhoto(ctx, A, LAYOUT.photoL, t);
  await drawPhoto(ctx, B, LAYOUT.photoR, t);

  // 두 사진 사이 도장: 緣(인연) / 剋(상극)
  const st = LAYOUT.stamp;
  drawSeal(ctx, st.x, st.y, st.size, -0.08, t.ink, t.paper, [[t.stamp, `900 56px ${F_BOLD}`, 2]]);

  drawName(ctx, A, LAYOUT.photoL.x, LAYOUT.photoL.y + 215, t);
  drawName(ctx, B, LAYOUT.photoR.x, LAYOUT.photoR.y + 215, t);

  // 점수 낙관
  drawSeal(ctx, 830, 640, 130, 0.08, t.ink, t.paper, [
    [`${r.total}`, `800 56px ${F_TITLE}`, -12],
    ["點", `900 26px ${F_BOLD}`, 34],
  ]);

  // 신탁
  const rb = LAYOUT.reason;
  ctx.strokeStyle = t.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(rb.x, rb.y, rb.w, rb.h);
  drawSeal(ctx, rb.x + 72, rb.y + rb.h / 2, 72, 0, t.ink, t.paper, [["神託", `900 24px ${F_BOLD}`, 1]]);

  const textX = rb.x + 126 + (rb.w - 146) / 2;
  ctx.fillStyle = t.text;
  ctx.font = `700 36px ${F_TITLE}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapText(ctx, info.short, rb.w - 190).slice(0, 2);
  const lh = 54;
  const cy = rb.y + rb.h / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, textX, cy + i * lh));

  return cv;
}
