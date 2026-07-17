/* ============================================================
   STOCK PAGE — pulls the Stock tab via Apps Script (action=stock).
   Contains no customer data whatsoever — safe to show publicly.
============================================================ */
(function(){
  const grid = document.getElementById('stockGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const chips = document.querySelectorAll('.filter-chip');
  document.getElementById('repoLink').href = CONFIG.IMAGE_REPO_LINK;

  let allItems = [];
  let activeFilter = 'all';

  function tagFor(qty){
    if (qty <= 0) return { cls: 'out', label: 'Sold Out' };
    if (qty <= 2) return { cls: 'low', label: `Only ${qty} left` };
    return { cls: '', label: `${qty} in stock` };
  }

  function render(){
    const q = (searchInput.value || '').trim().toLowerCase();
    const filtered = allItems.filter(item => {
      const matchesSearch = !q || item.code.toLowerCase().includes(q);
      const qty = Number(item.qty) || 0;
      const matchesFilter =
        activeFilter === 'all' ? true :
        activeFilter === 'in' ? qty > 2 :
        activeFilter === 'low' ? qty > 0 && qty <= 2 : true;
      return matchesSearch && matchesFilter;
    });

    if (!filtered.length){
      grid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    grid.innerHTML = filtered.map((item, i) => {
      const tag = tagFor(Number(item.qty) || 0);
      return `
      <article class="stock-card" style="animation-delay:${i * 45}ms;">
        <div class="thumb">
          <span class="avail-tag ${tag.cls}">${tag.label}</span>
          <img data-img-source="${escapeHtml(item.image || item.code)}" alt="Saree ${escapeHtml(item.code)}" loading="lazy">
        </div>
        <div class="body">
          <span class="code">${escapeHtml(item.code)}</span>
          <h3>Saree ${escapeHtml(item.code)}</h3>
          <div class="qty-line">
            <span>Available</span>
            <strong>${Number(item.qty) || 0} pc${(Number(item.qty)||0) === 1 ? '' : 's'}</strong>
          </div>
        </div>
      </article>`;
    }).join('');

    grid.querySelectorAll('img[data-img-source]').forEach(img => {
      setupImageFallback(img, img.dataset.imgSource);
    });
  }

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  searchInput.addEventListener('input', render);
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    render();
  }));

  async function load(){
    try{
      const data = await callApi({ action: 'stock' });
      allItems = (data && data.stock) || [];
      render();
    }catch(err){
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
        <p>Stock isn't connected yet.<br><small style="color:#9aa39e;">Add your Apps Script Web App URL in <code>js/config.js</code>.</small></p>
      </div>`;
      console.warn('Stock load failed:', err.message);
    }
  }
  load();
})();
