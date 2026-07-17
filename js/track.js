/* ============================================================
   ORDER TRACKING — the only page that ever touches customer data.
   Requires BOTH the exact Order ID and the last 4 mobile digits
   to match before anything is shown. See apps-script/Code.gs
   (action=track) for the matching server-side check.
============================================================ */
(function(){
  const form = document.getElementById('trackForm');
  const statusBox = document.getElementById('trackStatus');
  const resultsBox = document.getElementById('orderResults');
  const submitBtn = document.getElementById('trackSubmit');
  document.getElementById('repoLink').href = CONFIG.IMAGE_REPO_LINK;

  function escapeHtml(str){
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function setStatus(kind, html){
    statusBox.className = 'track-status show ' + kind;
    statusBox.innerHTML = html;
  }
  function clearStatus(){
    statusBox.className = 'track-status';
    statusBox.innerHTML = '';
  }

  function fmtDate(v){
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function stepsFor(item){
    const placed = true;
    const couriered = !!item.courieredDate;
    const delivered = !!item.deliveredDate;
    return [
      { label: 'Order Placed', done: placed, date: item.orderDate },
      { label: 'Couriered', done: couriered, date: item.courieredDate },
      { label: 'Delivered', done: delivered, date: item.deliveredDate },
    ];
  }

  function renderResults(order, items){
    const multi = items.length > 1;

    const summary = `
      <div class="order-summary reveal in">
        <div class="stat"><div class="k">Order ID</div><div class="v">${escapeHtml(order.orderId)}</div></div>
        <div class="stat"><div class="k">Ordered By</div><div class="v">${escapeHtml(order.customerName)}</div></div>
        <div class="stat"><div class="k">Order Date</div><div class="v">${fmtDate(order.orderDate)}</div></div>
        <div class="stat"><div class="k">Items</div><div class="v">${items.length} saree${items.length === 1 ? '' : 's'}</div></div>
      </div>`;

    const tabs = multi ? `
      <div class="item-tabs">
        ${items.map((it, i) => `<button type="button" class="item-tab ${i === 0 ? 'active' : ''}" data-idx="${i}">${escapeHtml(it.product || 'Saree ' + (i+1))}</button>`).join('')}
      </div>` : '';

    const cards = items.map((it, i) => {
      const steps = stepsFor(it);
      const hasFeedback = it.feedback && String(it.feedback).trim().length;
      return `
      <div class="item-card ${i === 0 ? 'active' : ''}" data-idx="${i}">
        <div class="thumb">
          <img data-img-source="${escapeHtml(it.image || it.product)}" alt="${escapeHtml(it.product || 'Saree')}" loading="lazy">
        </div>
        <div class="info">
          <span class="code">${escapeHtml(order.orderId)}${multi ? ' · Item ' + (i+1) : ''}</span>
          <h3>${escapeHtml(it.product || 'Saree')}</h3>
          <dl>
            <dt>Quantity</dt><dd>${escapeHtml(it.quantity ?? '1')}</dd>
            <dt>Couriered</dt><dd>${fmtDate(it.courieredDate)}</dd>
            <dt>Delivered</dt><dd>${fmtDate(it.deliveredDate)}</dd>
          </dl>

          <div class="status-track">
            ${steps.map(s => `
              <div class="step ${s.done ? 'done' : ''}">
                <div class="dot"></div>
                <div class="label">${s.label}</div>
              </div>`).join('')}
          </div>

          ${hasFeedback ? `
          <div class="feedback-given">
            <span class="eyebrow" style="margin-bottom:0.5rem; display:inline-flex;">Your Feedback</span>
            <div class="stars">${starMarkup(it.stars)}</div>
            <p style="font-style:italic; font-family:'Cormorant Garamond', serif; font-size:1.05rem; margin:0.4rem 0 0;">"${escapeHtml(it.feedback)}"</p>
          </div>` : `
          <div class="feedback-given">
            <p style="margin:0; font-size:0.85rem; color:#77817c;">No feedback recorded yet for this item.</p>
          </div>`}
        </div>
      </div>`;
    }).join('');

    resultsBox.innerHTML = summary + tabs + cards;
    resultsBox.style.display = 'block';
    resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });

    resultsBox.querySelectorAll('img[data-img-source]').forEach(img => {
      setupImageFallback(img, img.dataset.imgSource);
    });

    resultsBox.querySelectorAll('.item-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        resultsBox.querySelectorAll('.item-tab').forEach(t => t.classList.remove('active'));
        resultsBox.querySelectorAll('.item-card').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        resultsBox.querySelector(`.item-card[data-idx="${tab.dataset.idx}"]`).classList.add('active');
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsBox.style.display = 'none';
    resultsBox.innerHTML = '';

    const orderId = document.getElementById('orderId').value.trim();
    const phone4 = document.getElementById('phone4').value.trim();

    if (!orderId || !/^\d{4}$/.test(phone4)){
      setStatus('error', 'Please enter your Order ID and exactly 4 digits of your mobile number.');
      return;
    }

    submitBtn.disabled = true;
    setStatus('loading', '<span class="spinner-feather"></span>Looking up your order…');

    try{
      const data = await callApi({ action: 'track', orderId, phone4 });
      if (!data || !data.found){
        setStatus('error', 'We couldn\'t find an order matching those details. Please double-check your Order ID and mobile digits.');
        return;
      }
      clearStatus();
      renderResults(data.order, data.items || []);
    }catch(err){
      if (err.message === 'CONFIG_MISSING'){
        setStatus('error', 'Order tracking isn\'t connected yet — add your Apps Script Web App URL in js/config.js.');
      } else {
        setStatus('error', 'Something went wrong reaching our records. Please try again in a moment.');
      }
      console.warn('Track lookup failed:', err.message);
    }finally{
      submitBtn.disabled = false;
    }
  });
})();
