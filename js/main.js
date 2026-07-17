/* ============================================================
   MAYILMATHI SAREES — SHARED SITE BEHAVIOUR
============================================================ */

/* ---- mobile nav ---- */
(function initNav(){
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    toggle.classList.remove('open');
    links.classList.remove('open');
  }));
})();

/* ---- highlight active nav link ---- */
(function highlightActive(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) a.classList.add('active');
  });
})();

/* ---- scroll reveal ---- */
(function initReveal(){
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(i => io.observe(i));
})();

/* ---- footer year ---- */
document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());

/* ============================================================
   Feather-fan SVG builder — the site's signature motif.
   Used on the hero and reused (smaller) as section dividers.
============================================================ */
function buildFeatherFan(quillCount = 9){
  const cx = 210, baseY = 400, spread = 150; // degrees of total spread
  let quills = '';
  for (let i = 0; i < quillCount; i++){
    const t = quillCount === 1 ? 0.5 : i / (quillCount - 1);
    const angle = -spread / 2 + t * spread;
    const delay = 120 + i * 90;
    const hue = i % 2 === 0 ? 'var(--emerald)' : 'var(--peacock-2)';
    quills += `
      <g class="quill" style="--rot:${angle}deg; --delay:${delay}ms;">
        <path d="M210 400 C 198 260, 202 140, 210 40" stroke="${hue}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <ellipse class="eye" style="--delay:${delay + 400}ms;" cx="210" cy="60" rx="26" ry="34" fill="var(--gold)"/>
        <ellipse cx="210" cy="60" rx="15" ry="21" fill="var(--wine)"/>
        <ellipse cx="210" cy="60" rx="6" ry="9" fill="var(--midnight)"/>
      </g>`;
  }
  return `<svg class="feather-fan" viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${quills}</svg>`;
}

function buildDividerFan(){
  return `<svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 36 Q100 -10 180 36" stroke="var(--gold)" stroke-width="1" fill="none" opacity="0.6"/>
    <circle cx="100" cy="14" r="4" fill="var(--gold)"/>
    <circle cx="60" cy="24" r="2.4" fill="var(--gold)" opacity="0.7"/>
    <circle cx="140" cy="24" r="2.4" fill="var(--gold)" opacity="0.7"/>
  </svg>`;
}

document.querySelectorAll('[data-feather-hero]').forEach(el => { el.innerHTML = buildFeatherFan(9); });
document.querySelectorAll('[data-feather-divider]').forEach(el => { el.innerHTML = buildDividerFan(); });

/* ============================================================
   Stars helper — renders "★★★★☆" style markup safely.
============================================================ */
function starMarkup(stars){
  const n = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)));
  let html = '';
  for (let i = 0; i < 5; i++){
    html += i < n ? '★' : '<span class="off">★</span>';
  }
  return html;
}

/* ============================================================
   API helper — talks only to the Apps Script Web App.
   Every call is read-only and scoped to what each page needs;
   see apps-script/Code.gs for the matching server-side routes.
============================================================ */
async function callApi(params){
  if (!CONFIG.API_URL || CONFIG.API_URL.includes('PASTE_YOUR')){
    throw new Error('CONFIG_MISSING');
  }
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) throw new Error('NETWORK_' + res.status);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

function resolveImageUrl(filename){
  if (!filename) return '';
  if (/^https?:\/\//i.test(filename)) return filename;
  return CONFIG.IMAGE_BASE_URL + filename;
}

/* ============================================================
   Image fallback chain — tries several common extensions so a
   sheet that just says "SE_01" (no extension) still finds the
   photo whether it's actually SE_01.jpg, .jpeg, .png or .webp.
   If an explicit filename with an extension is given, that is
   tried first; if it 404s, the other extensions are still tried
   as a safety net.
============================================================ */
const IMAGE_FALLBACK_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'PNG'];

function buildImageCandidates(codeOrValue){
  const raw = String(codeOrValue || '').trim();
  if (!raw) return [];
  if (/^https?:\/\//i.test(raw)) return [raw];

  const hasExtension = /\.[a-zA-Z0-9]{3,4}$/.test(raw);
  const base = hasExtension ? raw.replace(/\.[a-zA-Z0-9]{3,4}$/, '') : raw;
  const candidates = [];

  if (hasExtension) candidates.push(CONFIG.IMAGE_BASE_URL + raw); // explicit filename first
  IMAGE_FALLBACK_EXTENSIONS.forEach(ext => {
    candidates.push(CONFIG.IMAGE_BASE_URL + base + '.' + ext);
  });
  return [...new Set(candidates)];
}

// Attach this to an <img>'s onerror to walk through candidates,
// then fall back to a soft peacock-gradient placeholder.
function setupImageFallback(imgEl, codeOrValue){
  const candidates = buildImageCandidates(codeOrValue);
  if (!candidates.length){
    hideToPlaceholder_(imgEl);
    return;
  }
  imgEl.dataset.candidateIdx = '0';
  imgEl.src = candidates[0];
  imgEl.onerror = function(){
    const idx = Number(imgEl.dataset.candidateIdx || '0') + 1;
    if (idx < candidates.length){
      imgEl.dataset.candidateIdx = String(idx);
      imgEl.src = candidates[idx];
    } else {
      hideToPlaceholder_(imgEl);
    }
  };
}

function hideToPlaceholder_(imgEl){
  imgEl.onerror = null;
  imgEl.style.display = 'none';
  const wrap = imgEl.closest('.thumb');
  if (wrap) wrap.style.background = 'linear-gradient(135deg,var(--peacock),var(--midnight))';
}

