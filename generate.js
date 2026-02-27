#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function usage() {
  console.error(`
  Catalog Extract → HTML Visualizer

  Usage:
    node generate.js <input.json> [output.html]
    curl ... | node generate.js - [output.html]
    cat data.json | node generate.js

  Arguments:
    input.json   Path to Catalog API JSON response (use "-" for stdin)
    output.html  Output path (default: <handle|execution_id>.html)

  Examples:
    node generate.js response.json
    node generate.js response.json my-product.html
    curl -s https://api.getcatalog.ai/v2/extract/... -H "x-api-key: ..." | node generate.js -
  `);
  process.exit(1);
}

function readInput() {
  const arg = process.argv[2];

  if (!arg || arg === '-') {
    if (process.stdin.isTTY && !arg) usage();
    return new Promise((resolve, reject) => {
      let chunks = [];
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', c => chunks.push(c));
      process.stdin.on('end', () => resolve(chunks.join('')));
      process.stdin.on('error', reject);
    });
  }

  if (arg === '--help' || arg === '-h') usage();
  return Promise.resolve(fs.readFileSync(arg, 'utf8'));
}

function escapeForEmbed(str) {
  return str.replace(/<\/script>/gi, '<\\/script>');
}

function generateHTML(data) {
  const status = data.status || 'unknown';
  const productCount = data.data ? data.data.length : 0;
  const firstProduct = data.data && data.data[0] ? data.data[0].product : null;
  const titleText = firstProduct
    ? `${firstProduct.brand || ''} ${firstProduct.title || ''}`.trim()
    : 'Catalog Extract';

  const jsonStr = escapeForEmbed(JSON.stringify(data));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleText} — Catalog Extract Viewer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #faf6f2;
    --surface: #ffffff;
    --surface-2: #f2f4f7;
    --surface-warm: #fcf6ef;
    --border: #e4e7ec;
    --border-dark: #d0d5dd;
    --text: #121212;
    --text-dim: rgba(0,0,0,0.56);
    --text-muted: #667085;
    --accent: #121212;
    --accent-green: #00D54B;
    --accent-green-dark: #00b158;
    --cta: #ec5a29;
    --cta-hover: #d44e21;
    --warm-brown: #2b180a;
    --warm-taupe: #94877c;
    --green: #00b158;
    --orange: #ec5a29;
    --red: #d44e21;
    --radius: 12px;
    --radius-sm: 8px;
  }

  body {
    font-family: 'Inter', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .top-bar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 12px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
  }

  .top-bar-left { display: flex; align-items: center; gap: 12px; }

  .logo {
    width: 28px; height: 28px; background: var(--accent); border-radius: 6px;
    display: grid; place-items: center; font-weight: 700; font-size: 14px; color: white;
  }

  .top-bar h1 { font-size: 15px; font-weight: 600; color: var(--text); font-family: 'DM Sans', 'Inter', sans-serif; }

  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-success { background: rgba(0,213,75,.1); color: var(--green); }
  .badge-info { background: rgba(18,18,18,.06); color: var(--text); }
  .badge-warn { background: rgba(236,90,41,.1); color: var(--orange); }
  .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  .container { max-width: 1320px; margin: 0 auto; padding: 28px 32px; }

  .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 36px; }
  .gallery { display: flex; gap: 16px; }
  .gallery-thumbs { display: flex; flex-direction: column; gap: 10px; }
  .gallery-thumb { width: 72px; height: 72px; border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; border: 2px solid var(--border); transition: border-color .2s, transform .15s; background: #fff; }
  .gallery-thumb.active { border-color: var(--accent); }
  .gallery-thumb:hover { transform: scale(1.05); }
  .gallery-thumb img { width: 100%; height: 100%; object-fit: contain; }
  .gallery-main { flex: 1; background: #fff; border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; display: grid; place-items: center; aspect-ratio: 7/8.56; max-height: 520px; }
  .gallery-main img { max-width: 100%; max-height: 100%; object-fit: contain; transition: opacity .3s; }

  .product-info { display: flex; flex-direction: column; gap: 20px; }
  .brand-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent-green-dark); font-weight: 600; }
  .product-title { font-size: 28px; font-weight: 700; line-height: 1.25; font-family: 'DM Sans', 'Inter', sans-serif; color: var(--warm-brown); }
  .product-summary { color: var(--text-dim); font-size: 15px; line-height: 1.7; }

  .price-row { display: flex; align-items: baseline; gap: 12px; }
  .price { font-size: 32px; font-weight: 700; color: var(--text); }
  .price-currency { font-size: 16px; color: var(--text-muted); font-weight: 500; }

  .rating-row { display: flex; align-items: center; gap: 10px; }
  .stars { display: flex; gap: 2px; }
  .star { width: 18px; height: 18px; color: var(--cta); }
  .star-empty { color: var(--border-dark); }
  .rating-text { font-size: 14px; color: var(--text-dim); }
  .rating-text strong { color: var(--text); }

  .meta-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); }
  .chip-label { color: var(--text); font-weight: 600; margin-right: 4px; }

  .sizes-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .size-btn { width: 52px; height: 38px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; display: grid; place-items: center; }
  .size-btn:hover, .size-btn.active { border-color: var(--accent); background: rgba(18,18,18,.06); color: var(--text); }

  .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-dim); font-weight: 600; margin-bottom: 10px; }

  .cta-row { display: flex; gap: 12px; }
  .btn-primary { padding: 12px 32px; border-radius: 100px; border: none; background: var(--accent); color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .2s; text-decoration: none; display: inline-flex; align-items: center; }
  .btn-primary:hover { background: var(--warm-brown); }
  .btn-outline { padding: 12px 24px; border-radius: 100px; border: 1px solid var(--border-dark); background: transparent; color: var(--text); font-size: 14px; font-weight: 500; cursor: pointer; transition: all .2s; }
  .btn-outline:hover { border-color: var(--accent); background: var(--surface-2); }

  .content-section { margin-bottom: 56px; }
  .section-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .section-heading h3 { font-family: 'DM Sans', 'Inter', sans-serif; font-size: 20px; font-weight: 700; color: var(--warm-brown); }
  .section-heading .section-count { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--surface-2); padding: 3px 10px; border-radius: 20px; }
  .section-heading-icon { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
  .section-heading-icon svg { width: 18px; height: 18px; }

  .icon-green { background: rgba(0,213,75,.1); color: var(--green); }
  .icon-orange { background: rgba(236,90,41,.1); color: var(--cta); }
  .icon-dark { background: rgba(18,18,18,.06); color: var(--text); }
  .icon-brown { background: rgba(43,24,10,.08); color: var(--warm-brown); }
  .icon-reddit { background: #ff45001a; color: #ff4500; }
  .icon-muted { background: var(--surface-2); color: var(--text-muted); }

  .empty-state { background: var(--surface); border: 1px dashed var(--border-dark); border-radius: var(--radius); padding: 48px 32px; text-align: center; }
  .empty-state-icon { width: 48px; height: 48px; margin: 0 auto 16px; border-radius: 50%; background: var(--surface-2); display: grid; place-items: center; color: var(--text-muted); }
  .empty-state-icon svg { width: 22px; height: 22px; }
  .empty-state h4 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .empty-state p { font-size: 13px; color: var(--text-muted); max-width: 360px; margin: 0 auto; line-height: 1.6; }
  .empty-state .empty-detail { margin-top: 16px; font-size: 12px; color: var(--warm-taupe); font-family: 'Fragment Mono', monospace; }

  .attr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .attr-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .attr-card h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 10px; font-weight: 600; }
  .attr-card p, .attr-card li { font-size: 14px; color: var(--text); }
  .attr-card ul { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
  .attr-card ul li { background: var(--surface-2); padding: 4px 12px; border-radius: 16px; font-size: 12px; }
  .attr-features li { position: relative; padding-left: 16px; margin-bottom: 6px; font-size: 14px; color: var(--text-dim); }
  .attr-features li::before { content: ''; position: absolute; left: 0; top: 9px; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green); }

  .img-analysis-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
  .img-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .img-card-preview { background: var(--surface-warm); height: 220px; display: grid; place-items: center; border-bottom: 1px solid var(--border); }
  .img-card-preview img { max-height: 200px; max-width: 100%; object-fit: contain; }
  .img-card-body { padding: 18px; }
  .img-card-body h4 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
  .img-card-body p { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-bottom: 12px; }
  .color-swatches { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .color-swatch { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 16px; background: var(--surface-2); font-size: 11px; color: var(--text-dim); }
  .swatch-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--border-dark); }
  .label-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .label-tag { padding: 2px 8px; border-radius: 4px; font-size: 10px; background: var(--surface-2); color: var(--text-dim); }

  .reviews-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .reviews-summary { display: flex; align-items: center; gap: 16px; }
  .reviews-big-num { font-size: 48px; font-weight: 700; color: var(--text); line-height: 1; font-family: 'DM Sans', 'Inter', sans-serif; }
  .reviews-bars { display: flex; flex-direction: column; gap: 4px; }
  .review-bar-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-dim); }
  .review-bar-row span:first-child { width: 12px; text-align: right; }
  .review-bar { width: 120px; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
  .review-bar-fill { height: 100%; background: var(--cta); border-radius: 3px; }
  .reviews-list { display: grid; gap: 14px; }
  .review-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .review-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .review-card-header h4 { font-size: 14px; font-weight: 600; }
  .review-meta { font-size: 12px; color: var(--text-dim); display: flex; gap: 12px; }
  .review-card p { font-size: 13px; color: var(--text-dim); line-height: 1.7; }
  .review-stars { display: flex; gap: 2px; }
  .review-star { font-size: 12px; color: var(--cta); }
  .review-star.empty { color: var(--border-dark); }

  .variants-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .variants-table th { text-align: left; padding: 10px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); border-bottom: 1px solid var(--border); font-weight: 600; }
  .variants-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text); }
  .variants-table tr:hover td { background: var(--surface); }

  .similar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .similar-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color .2s, transform .15s; display: flex; flex-direction: column; gap: 4px; }
  .similar-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .similar-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .similar-card-icon { display: flex; align-items: center; gap: 8px; }
  .similar-card-icon img { border-radius: 4px; flex-shrink: 0; }
  .similar-card-domain { font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .similar-card h4 { font-size: 14px; font-weight: 600; margin-bottom: 2px; line-height: 1.4; }
  .similar-card .sim-brand { font-size: 12px; color: var(--accent-green-dark); margin-bottom: 4px; font-weight: 500; }
  .similar-card a { font-size: 12px; color: var(--accent-green-dark); text-decoration: none; font-weight: 500; margin-top: auto; }
  .similar-card a:hover { text-decoration: underline; }
  .similarity-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
  .sim-high { background: rgba(0,213,75,.1); color: var(--green); }
  .sim-medium { background: rgba(236,90,41,.1); color: var(--orange); }
  .sim-low { background: rgba(212,78,33,.1); color: var(--red); }

  .reddit-overview { display: grid; grid-template-columns: 1fr auto; gap: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 24px; }
  .reddit-oneliner { font-size: 16px; line-height: 1.6; color: var(--text); font-weight: 500; }
  .reddit-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .reddit-sentiment { display: flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap; }
  .sentiment-positive { background: rgba(0,213,75,.1); color: var(--green); }
  .sentiment-negative { background: rgba(212,78,33,.1); color: var(--red); }
  .sentiment-mixed { background: rgba(236,90,41,.1); color: var(--orange); }
  .sentiment-neutral { background: rgba(18,18,18,.06); color: var(--text-muted); }
  .reddit-confidence { font-size: 12px; color: var(--text-dim); padding: 6px 14px; border-radius: 20px; background: var(--surface-2); white-space: nowrap; }
  .reddit-subsection { margin-bottom: 28px; }
  .reddit-subsection-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 14px; }
  .reddit-themes { display: grid; gap: 10px; }
  .reddit-theme { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
  .reddit-theme-name { font-size: 14px; font-weight: 500; color: var(--text); flex: 1; }
  .stance-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
  .stance-positive { background: rgba(0,213,75,.1); color: var(--green); }
  .stance-negative { background: rgba(212,78,33,.1); color: var(--red); }
  .stance-mixed { background: rgba(236,90,41,.1); color: var(--orange); }
  .stance-neutral { background: rgba(18,18,18,.06); color: var(--text-muted); }
  .reddit-gotchas { display: grid; gap: 10px; }
  .reddit-gotcha { background: var(--surface); border-left: 3px solid var(--border-dark); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 14px 18px; display: flex; align-items: flex-start; gap: 12px; }
  .gotcha-severity { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; margin-top: 2px; }
  .gotcha-high { background: rgba(212,78,33,.12); color: var(--red); border-left-color: var(--red); }
  .gotcha-medium { background: rgba(236,90,41,.12); color: var(--orange); border-left-color: var(--orange); }
  .gotcha-low { background: rgba(18,18,18,.06); color: var(--text-muted); }
  .reddit-gotcha.gotcha-high { border-left-color: var(--red); }
  .reddit-gotcha.gotcha-medium { border-left-color: var(--orange); }
  .reddit-gotcha.gotcha-low { border-left-color: var(--border-dark); }
  .gotcha-text { font-size: 13px; color: var(--text-dim); line-height: 1.6; }
  .reddit-questions { display: grid; gap: 12px; }
  .reddit-question { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
  .reddit-question h4 { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
  .reddit-question p { font-size: 13px; color: var(--text-dim); line-height: 1.7; }
  .reddit-comparisons { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .reddit-comparison { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
  .reddit-comparison h4 { font-size: 13px; font-weight: 700; color: var(--accent-green-dark); margin-bottom: 8px; }
  .reddit-comparison p { font-size: 13px; color: var(--text-dim); line-height: 1.6; }
  .reddit-evidence { display: grid; gap: 14px; }
  .reddit-evidence-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
  .reddit-evidence-card h4 { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
  .reddit-evidence-card p { font-size: 13px; color: var(--text-dim); line-height: 1.7; margin-bottom: 10px; }
  .reddit-evidence-footer { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-muted); }
  .reddit-evidence-footer a { color: #ff4500; text-decoration: none; font-weight: 500; }
  .reddit-evidence-footer a:hover { text-decoration: underline; }
  .reddit-use-cases { display: flex; flex-wrap: wrap; gap: 8px; }
  .reddit-use-case { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; background: var(--surface); border: 1px solid var(--border); color: var(--text-dim); }

  .json-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; max-height: 600px; overflow: auto; }
  .json-panel pre { font-family: 'Fragment Mono', 'SF Mono', 'Fira Code', monospace; font-size: 12px; line-height: 1.6; color: var(--text-dim); white-space: pre-wrap; word-break: break-all; }
  .json-key { color: var(--warm-brown); }
  .json-string { color: var(--accent-green-dark); }
  .json-number { color: var(--cta); }
  .json-bool { color: #7c3aed; }
  .json-null { color: var(--text-muted); font-style: italic; }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-dark); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; }
    .container { padding: 20px 16px; }
    .gallery { flex-direction: column-reverse; }
    .gallery-thumbs { flex-direction: row; }
    .gallery-thumb { width: 56px; height: 56px; }
  }
</style>
</head>
<body>

<div class="top-bar">
  <div class="top-bar-left">
    <div class="logo">C</div>
    <h1>Catalog Extract Viewer</h1>
  </div>
  <div style="display:flex;gap:8px;align-items:center;">
    <span class="badge badge-success"><span class="badge-dot"></span> ${status}</span>
    <span class="badge badge-info">${productCount} Product${productCount !== 1 ? 's' : ''}</span>
  </div>
</div>

<div class="container" id="app"></div>

<script>
const DATA = ${jsonStr};

const product = DATA.data[0].product;
const meta = DATA.meta;

const COLOR_MAP = {
  'tan/beige':'#d2b48c','brown':'#8B4513','brown / tan':'#a0785a','dark brown':'#5c3317',
  'black':'#1a1a1a','olive/green':'#556B2F','olive / dark green':'#4b5320','orange':'#e67e22',
  'yellow':'#f1c40f','black-and-yellow':'linear-gradient(135deg,#1a1a1a 50%,#f1c40f 50%)',
  'tan / gold':'#c9a961','white':'#ffffff','light brown / tan / taupe':'#b8977e',
  'brown (reddish-brown)':'#8b3a2a','black / dark charcoal':'#2d2d2d','black (in laces)':'#111',
  'red':'#c0392b','blue':'#2980b9','navy':'#1a2744','gray':'#7f8c8d','grey':'#7f8c8d',
  'green':'#27ae60','pink':'#e84393','purple':'#8e44ad','beige':'#d2b48c','cream':'#fffdd0',
  'khaki':'#c3b091','silver':'#bdc3c7','gold':'#d4a017','burgundy':'#800020','coral':'#ff7f50',
  'teal':'#008080','turquoise':'#40e0d0','maroon':'#800000','ivory':'#fffff0','charcoal':'#36454f',
};

function starsSVG(rating, scale, size) {
  size = size || 18;
  var h = '';
  for (var i = 1; i <= scale; i++) {
    var filled = i <= Math.round(rating);
    h += '<svg class="star '+(filled?'':'star-empty')+'" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }
  return h;
}

function reviewStars(rating) {
  var h = '';
  for (var i = 1; i <= 5; i++) h += '<span class="review-star '+(i<=rating?'':'empty')+'">&#9733;</span>';
  return h;
}

function syntaxHighlight(json) {
  var s = JSON.stringify(json, null, 2);
  return s.replace(/("(\\\\u[\\da-fA-F]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(\\.\\d+)?([eE][+-]?\\d+)?)/g, function(m) {
    var c = 'json-number';
    if (/^"/.test(m)) c = /:$/.test(m) ? 'json-key' : 'json-string';
    else if (/true|false/.test(m)) c = 'json-bool';
    else if (/null/.test(m)) c = 'json-null';
    return '<span class="'+c+'">'+m+'</span>';
  });
}

function ratingDistribution(reviews) {
  var d = {5:0,4:0,3:0,2:0,1:0};
  (reviews||[]).forEach(function(r) { d[r.rating] = (d[r.rating]||0)+1; });
  var mx = Math.max.apply(null, Object.values(d).concat([1]));
  return {dist:d, max:mx};
}

var ICONS = {
  attributes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  images: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  reviews: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  variants: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  similar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.462.342.342 0 0 0-.461 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.206-.095z"/></svg>',
  brand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  faqs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
  json: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
};

function icon(k) { return ICONS[k]||''; }

function heading(ic, cls, title, count) {
  return '<div class="section-heading"><div class="section-heading-icon '+cls+'">'+icon(ic)+'</div><h3>'+title+'</h3>'+(count!=null?'<span class="section-count">'+count+'</span>':'')+'</div>';
}

function empty(ic, title, desc, detail) {
  return '<div class="empty-state"><div class="empty-state-icon">'+icon(ic)+'</div><h4>'+title+'</h4><p>'+desc+'</p>'+(detail?'<div class="empty-detail">'+detail+'</div>':'')+'</div>';
}

function esc(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

function render() {
  var p = product;
  var rd = ratingDistribution(p.reviews);
  var dist = rd.dist, mx = rd.max;
  var sizeOpt = (p.options||[]).find(function(o){return o.name==='Size';});
  var h = '';

  // Hero
  h += '<section class="hero"><div class="gallery"><div class="gallery-thumbs">';
  (p.images||[]).forEach(function(img,i) {
    h += '<div class="gallery-thumb '+(i===0?'active':'')+'" onclick="switchImage('+i+')"><img src="'+esc(img.url)+'" alt="'+esc(img.alt_text)+'"></div>';
  });
  h += '</div><div class="gallery-main"><img id="mainImage" src="'+esc((p.images[0]||{}).url)+'" alt="'+esc((p.images[0]||{}).alt_text)+'"></div></div>';

  h += '<div class="product-info"><div><div class="brand-label">'+esc(p.brand)+'</div><h2 class="product-title">'+esc(p.title)+'</h2></div>';
  if (p.average_rating) h += '<div class="rating-row"><div class="stars">'+starsSVG(p.average_rating, p.rating_scale||5)+'</div><span class="rating-text"><strong>'+p.average_rating+'</strong> / '+(p.rating_scale||5)+' &mdash; '+(p.review_count||0)+' reviews</span></div>';
  h += '<div class="price-row"><span class="price">$'+p.price.current_value.toFixed(2)+'</span><span class="price-currency">'+esc(p.price.currency)+'</span>';
  h += p.is_available ? '<span class="badge badge-success"><span class="badge-dot"></span> In Stock</span>' : '<span class="badge badge-warn">Unavailable</span>';
  h += '</div>';
  h += '<p class="product-summary">'+esc(p.description)+'</p>';

  h += '<div class="meta-chips">';
  if (p.attributes.color) h += '<span class="chip"><span class="chip-label">Color:</span> '+esc(p.attributes.color.merchant_label)+' ('+esc(p.attributes.color.iscc_family)+')</span>';
  if (p.attributes.gender) h += '<span class="chip"><span class="chip-label">Gender:</span> '+esc(p.attributes.gender)+'</span>';
  if (p.attributes.material) h += '<span class="chip"><span class="chip-label">Material:</span> '+esc(p.attributes.material.merchant_label)+'</span>';
  if (p.attributes.style) h += '<span class="chip"><span class="chip-label">Style:</span> '+esc(p.attributes.style.join(', '))+'</span>';
  if (p.attributes.occasion) h += '<span class="chip"><span class="chip-label">Occasion:</span> '+esc(p.attributes.occasion.join(', '))+'</span>';
  if (p.google_product_category_path) h += '<span class="chip"><span class="chip-label">Category:</span> '+esc(p.google_product_category_path)+'</span>';
  h += '<span class="chip"><span class="chip-label">Store:</span> '+esc(p.store_domain)+'</span>';
  h += '</div>';

  if (sizeOpt) {
    h += '<div><div class="section-label">Available Sizes</div><div class="sizes-grid">';
    sizeOpt.values.forEach(function(s,i) { h += '<button class="size-btn '+(i===0?'active':'')+'" onclick="selectSize(this)">'+esc(s)+'</button>'; });
    h += '</div></div>';
  }

  h += '<div class="cta-row"><a href="'+esc(p.url)+'" target="_blank" class="btn-primary">View on '+esc(p.vendor)+'</a>';
  h += '<button class="btn-outline" onclick="document.getElementById(&quot;section-json&quot;).scrollIntoView({behavior:&quot;smooth&quot;})">View Raw JSON</button></div>';
  h += '</div></section>';

  // Attributes
  h += '<section class="content-section">'+heading('attributes','icon-green','Extracted Attributes');
  h += '<div class="attr-grid">';
  if (p.attributes.summary) h += '<div class="attr-card"><h4>Summary</h4><p>'+esc(p.attributes.summary)+'</p></div>';
  if (p.attributes.features) h += '<div class="attr-card"><h4>Features</h4><p>'+esc(p.attributes.features)+'</p></div>';
  if (p.attributes.additional_attributes && p.attributes.additional_attributes.length) {
    h += '<div class="attr-card"><h4>Additional Attributes</h4><ul class="attr-features">';
    p.attributes.additional_attributes.forEach(function(a){h+='<li>'+esc(a)+'</li>';});
    h += '</ul></div>';
  }
  if (p.attributes.material) {
    h += '<div class="attr-card"><h4>Material</h4><p style="margin-bottom:8px">'+esc(p.attributes.material.merchant_label)+'</p>';
    if (p.attributes.material.secondary) { h+='<ul>'; p.attributes.material.secondary.forEach(function(m){h+='<li>'+esc(m)+'</li>';}); h+='</ul>'; }
    h += '</div>';
  }
  h += '<div class="attr-card"><h4>Extraction Meta</h4><p style="font-size:13px;color:var(--text-dim)"><strong>Execution ID:</strong> '+esc(DATA.execution_id)+'<br><strong>Request ID:</strong> '+esc(meta.request_id)+'<br><strong>Duration:</strong> '+(meta.duration_ms/1000).toFixed(1)+'s<br><strong>Credits Used:</strong> '+meta.credits_used+'<br><strong>Platform ID:</strong> '+esc(p.platform_id)+'<br><strong>Updated:</strong> '+new Date(p.updated_at).toLocaleString()+'</p></div>';
  h += '<div class="attr-card"><h4>Product IDs</h4><p style="font-size:13px;color:var(--text-dim);word-break:break-all"><strong>Internal ID:</strong> '+esc(p.id)+'<br><strong>Handle:</strong> '+esc(p.handle)+'<br><strong>Google Category:</strong> '+esc(p.google_product_category_id)+' &mdash; '+esc(p.google_product_category_path)+'</p></div>';
  h += '</div></section>';

  // Images
  if (p.images && p.images.length) {
    h += '<section class="content-section">'+heading('images','icon-brown','Image Analysis',p.images.length+' images');
    h += '<div class="img-analysis-grid">';
    p.images.forEach(function(img,i) {
      var a = img.attributes||{};
      h += '<div class="img-card"><div class="img-card-preview"><img src="'+esc(img.url)+'" alt="'+esc(img.alt_text)+'"></div><div class="img-card-body">';
      h += '<h4>Image '+(i+1)+' &mdash; Position '+img.position;
      if (a.flat_lay) h += ' <span class="badge badge-info" style="margin-left:8px">Flat Lay</span>';
      if (a.confidence) h += ' <span class="badge badge-success" style="margin-left:4px">'+esc(a.confidence)+' confidence</span>';
      h += '</h4>';
      if (a.description) h += '<p>'+esc(a.description)+'</p>';
      if (a.text) h += '<p style="font-size:12px"><strong>Detected Text:</strong> '+esc(a.text.replace(/\\n/g,', '))+'</p>';
      if (a.colors && a.colors.length) {
        h += '<div class="section-label" style="margin-top:12px">Detected Colors</div><div class="color-swatches">';
        a.colors.forEach(function(c) {
          var bg = COLOR_MAP[c.color]||COLOR_MAP[c.color.toLowerCase()]||'#888';
          var isG = bg.indexOf('linear')===0;
          h += '<div class="color-swatch"><span class="swatch-dot" style="'+(isG?'background:'+bg:'background-color:'+bg)+'"></span> '+esc(c.color)+'</div>';
        });
        h += '</div>';
      }
      if (a.labels && a.labels.length) {
        h += '<div class="section-label" style="margin-top:14px">Labels</div><div class="label-tags">';
        a.labels.forEach(function(l){h+='<span class="label-tag">'+esc(l)+'</span>';});
        h += '</div>';
      }
      h += '</div></div>';
    });
    h += '</div></section>';
  }

  // Reviews
  h += '<section class="content-section">'+heading('reviews','icon-orange','Customer Reviews',(p.review_count||0)+' reviews');
  if (p.reviews && p.reviews.length) {
    h += '<div class="reviews-header"><div class="reviews-summary"><div class="reviews-big-num">'+p.average_rating+'</div><div><div class="stars" style="margin-bottom:4px">'+starsSVG(p.average_rating,p.rating_scale||5,16)+'</div><div style="font-size:13px;color:var(--text-dim)">'+(p.review_count||0)+' total reviews</div></div><div class="reviews-bars">';
    [5,4,3,2,1].forEach(function(n){h+='<div class="review-bar-row"><span>'+n+'</span><div class="review-bar"><div class="review-bar-fill" style="width:'+((dist[n]/mx)*100)+'%"></div></div><span>'+dist[n]+'</span></div>';});
    h += '</div></div></div><div class="reviews-list">';
    p.reviews.forEach(function(r){
      h += '<div class="review-card"><div class="review-card-header"><h4>'+esc(r.title)+'</h4><div class="review-meta"><span class="review-stars">'+reviewStars(r.rating)+'</span><span>'+esc(r.reviewer_name)+'</span><span>'+esc(r.date)+'</span></div></div><p>'+esc(r.content)+'</p></div>';
    });
    h += '</div>';
  } else {
    h += empty('reviews','No Reviews','No customer reviews were found for this product.');
  }
  h += '</section>';

  // Reddit
  var ri = p.reddit_insights;
  h += '<section class="content-section">'+heading('reddit','icon-reddit','Reddit Insights', ri ? ri.coverage.threads_used+' threads &middot; '+ri.coverage.subreddits.map(function(s){return 'r/'+esc(s);}).join(', ') : null);
  if (ri && ri.status === 'no_results') {
    h += empty('reddit','No Reddit Discussions Found', (ri.match||{}).notes||'No matching Reddit threads were found.', 'sentiment: '+ri.conversation_summary.sentiment.label+' &middot; confidence: '+ri.match.confidence);
  } else if (ri && ri.status === 'ok' && ri.conversation_summary) {
    var cs = ri.conversation_summary;
    var sent = cs.sentiment || {};
    var sentClass = 'sentiment-'+(sent.label||'neutral');

    // Overview card
    h += '<div class="reddit-overview"><div><div class="reddit-oneliner">'+esc(cs.one_liner)+'</div>';
    h += '<div class="reddit-meta">';
    h += '<span class="reddit-sentiment '+sentClass+'"><span class="badge-dot"></span> '+esc(sent.label||'unknown')+' sentiment</span>';
    if (ri.match && ri.match.confidence != null) h += '<span class="reddit-confidence">'+Math.round(ri.match.confidence*100)+'% match confidence</span>';
    h += '</div>';
    if (sent.explanation) h += '<p style="font-size:13px;color:var(--text-dim);margin-top:10px;line-height:1.6">'+esc(sent.explanation)+'</p>';
    h += '</div></div>';

    // Top Themes
    if (cs.top_themes && cs.top_themes.length) {
      h += '<div class="reddit-subsection"><div class="reddit-subsection-title">Top Themes</div><div class="reddit-themes">';
      cs.top_themes.forEach(function(t){
        h += '<div class="reddit-theme"><span class="reddit-theme-name">'+esc(t.theme)+'</span><span class="stance-badge stance-'+esc(t.stance)+'">'+esc(t.stance)+'</span></div>';
      });
      h += '</div></div>';
    }

    // Use Cases
    if (cs.use_cases && cs.use_cases.length) {
      h += '<div class="reddit-subsection"><div class="reddit-subsection-title">Common Use Cases</div><div class="reddit-use-cases">';
      cs.use_cases.forEach(function(u){
        h += '<span class="reddit-use-case">'+esc(u.use_case)+'</span>';
      });
      h += '</div></div>';
    }

    // Gotchas
    if (cs.gotchas && cs.gotchas.length) {
      h += '<div class="reddit-subsection"><div class="reddit-subsection-title">Watch Out For</div><div class="reddit-gotchas">';
      cs.gotchas.forEach(function(g){
        h += '<div class="reddit-gotcha gotcha-'+esc(g.severity)+'"><span class="gotcha-severity gotcha-'+esc(g.severity)+'">'+esc(g.severity)+'</span><span class="gotcha-text">'+esc(g.gotcha)+'</span></div>';
      });
      h += '</div></div>';
    }

    // Common Questions
    if (cs.common_questions && cs.common_questions.length) {
      h += '<div class="reddit-subsection"><div class="reddit-subsection-title">Community Q&amp;A</div><div class="reddit-questions">';
      cs.common_questions.forEach(function(q){
        h += '<div class="reddit-question"><h4>'+esc(q.question)+'</h4><p>'+esc(q.short_answer)+'</p></div>';
      });
      h += '</div></div>';
    }

    // Comparisons
    if (cs.comparisons && cs.comparisons.length) {
      h += '<div class="reddit-subsection"><div class="reddit-subsection-title">Compared To</div><div class="reddit-comparisons">';
      cs.comparisons.forEach(function(c){
        h += '<div class="reddit-comparison"><h4>vs '+esc(c.compared_to)+'</h4><p>'+esc(c.summary)+'</p></div>';
      });
      h += '</div></div>';
    }

    // Evidence threads
    if (ri.evidence && ri.evidence.items && ri.evidence.items.length) {
      h += '<div class="reddit-subsection"><div class="reddit-subsection-title">Source Threads</div><div class="reddit-evidence">';
      ri.evidence.items.forEach(function(e){
        h += '<div class="reddit-evidence-card"><h4>'+esc(e.title)+'</h4>';
        h += '<p>'+esc(e.excerpt)+'</p>';
        h += '<div class="reddit-evidence-footer">';
        if (e.author) h += '<span>u/'+esc(e.author)+'</span>';
        if (e.subreddit) h += '<span>r/'+esc(e.subreddit)+'</span>';
        if (e.thread && e.thread.url) h += '<a href="'+esc(e.thread.url)+'" target="_blank">View thread &rarr;</a>';
        h += '</div></div>';
      });
      h += '</div></div>';
    }
  } else {
    h += empty('reddit','Reddit Insights Unavailable','Reddit analysis data was not returned for this product.');
  }
  h += '</section>';

  // Brand PDP
  h += '<section class="content-section">'+heading('brand','icon-brown','Brand PDP Lookup');
  if (p.brand_pdp && p.brand_pdp.success) {
    h += '<div class="attr-grid"><div class="attr-card"><h4>Brand PDP</h4><p><strong>'+esc(p.brand_pdp.brand_name)+'</strong> &mdash; <a href="'+esc(p.brand_pdp.brand_pdp_url)+'" target="_blank" style="color:var(--accent-green-dark)">'+esc(p.brand_pdp.brand_pdp_url)+'</a></p>';
    if (p.brand_pdp.product_title) h+='<p style="margin-top:8px">'+esc(p.brand_pdp.product_title)+'</p>';
    h += '</div></div>';
  } else if (p.brand_pdp) {
    h += empty('brand','Not Found on Brand Site', esc(p.brand_pdp.error||'Product not matched on brand site.'), esc(p.brand_pdp.brand_name)+' &middot; '+esc(p.brand_pdp.brand_domain));
  } else {
    h += empty('brand','Brand PDP Data Unavailable','No brand site lookup was performed for this product.');
  }
  h += '</section>';

  // Variants
  if (p.variants && p.variants.length) {
    h += '<section class="content-section">'+heading('variants','icon-dark','Variants',p.variants.length+' SKUs');
    h += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden"><table class="variants-table"><thead><tr><th>SKU</th><th>Color</th><th>Size</th><th>Price</th><th>Available</th></tr></thead><tbody>';
    p.variants.forEach(function(v){
      h+='<tr><td style="font-family:monospace;font-size:12px">'+esc(v.sku)+'</td><td>'+esc(v.option1)+'</td><td>'+esc(v.option2)+'</td><td>$'+v.price.current_value.toFixed(2)+'</td><td>'+(v.is_available?'<span class="badge badge-success"><span class="badge-dot"></span> Yes</span>':'<span class="badge badge-warn">No</span>')+'</td></tr>';
    });
    h += '</tbody></table></div></section>';
  }

  // Also Seen Here
  if (p.similar_products && p.similar_products.length) {
    h += '<section class="content-section">'+heading('similar','icon-green','Also Seen Here',p.similar_products.length+' retailers');
    h += '<div class="similar-grid">';
    p.similar_products.forEach(function(s){
      var domain = '';
      try { domain = new URL(s.url).hostname.replace(/^www\./,''); } catch(e){}
      var favicon = domain ? 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=32' : '';
      h+='<div class="similar-card">';
      h+='<div class="similar-card-header"><div class="similar-card-icon">'+(favicon?'<img src="'+esc(favicon)+'" alt="" width="20" height="20">':'')+'<span class="similar-card-domain">'+esc(domain)+'</span></div><span class="similarity-badge sim-'+esc(s.similarity)+'">'+esc(s.similarity)+'</span></div>';
      h+='<h4>'+esc(s.title)+'</h4>';
      if (s.brand) h+='<div class="sim-brand">'+esc(s.brand)+'</div>';
      h+='<a href="'+esc(s.url)+'" target="_blank">View listing &rarr;</a>';
      h+='</div>';
    });
    h += '</div></section>';
  }

  // FAQs
  h += '<section class="content-section">'+heading('faqs','icon-muted','FAQs');
  if (p.faqs && p.faqs.length) {
    h += '<div class="reviews-list">';
    p.faqs.forEach(function(f){h+='<div class="review-card"><h4 style="margin-bottom:6px">'+esc(f.question)+'</h4><p>'+esc(f.answer)+'</p></div>';});
    h += '</div>';
  } else {
    h += empty('faqs','No FAQs Available','No frequently asked questions were found on the product page.');
  }
  h += '</section>';

  // Video
  h += '<section class="content-section">'+heading('video','icon-muted','Product Video');
  if (p.video_url) {
    h += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;aspect-ratio:16/9"><video src="'+esc(p.video_url)+'" controls style="width:100%;height:100%;object-fit:contain"></video></div>';
  } else {
    h += empty('video','No Video Available','No product video was found on the listing page.');
  }
  h += '</section>';

  // JSON
  h += '<section class="content-section" id="section-json">'+heading('json','icon-dark','Raw JSON Response');
  h += '<div class="json-panel"><pre>'+syntaxHighlight(DATA)+'</pre></div></section>';

  document.getElementById('app').innerHTML = h;
}

function switchImage(idx) {
  document.getElementById('mainImage').src = product.images[idx].url;
  document.querySelectorAll('.gallery-thumb').forEach(function(t,i) { t.classList.toggle('active', i===idx); });
}

function selectSize(el) {
  document.querySelectorAll('.size-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
}

render();
</` + `script>
</body>
</html>`;
}

async function main() {
  const raw = await readInput();
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Error: Invalid JSON input.');
    console.error(e.message);
    process.exit(1);
  }

  if (!data.data || !data.data.length || !data.data[0].product) {
    console.error('Error: JSON does not contain a valid Catalog extract response (expected data[].product).');
    process.exit(1);
  }

  const html = generateHTML(data);

  const outArg = process.argv[3];
  let outPath;
  if (outArg) {
    outPath = outArg;
  } else {
    const product = data.data[0].product;
    const slug = product.handle || data.execution_id || 'catalog-extract';
    outPath = slug + '.html';
  }

  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Generated: ' + path.resolve(outPath));
  console.log('Product:   ' + (data.data[0].product.brand || '') + ' ' + (data.data[0].product.title || ''));
  console.log('Status:    ' + (data.status || 'unknown'));
}

main().catch(function(e) { console.error(e); process.exit(1); });
