/* ============================================================
   ORDER TRACKING — the only page that ever touches customer data.
   Requires BOTH the exact Order ID and the last 4 mobile digits
   to match before anything is shown. See apps-script/Code.gs
   (action=track) for the matching server-side check.

   Feedback add/edit re-sends the same Order ID + phone4 with the
   write request, and the server re-verifies that match against
   the sheet before saving anything — see submitFeedback_ in
   apps-script/Code.gs.
============================================================ */
(function(){
  const form = document.getElementById('trackForm');
  const statusBox = document.getElementById('trackStatus');
  const resultsBox = document.getElementById('orderResults');
  const submitBtn = document.getElementById('trackSubmit');
  document.getElementById('repoLink').href = CONFIG.IMAGE_REPO_LINK;

  // Set once a lookup succeeds, so feedback submissions don't need
  // to re-ask the customer for their Order ID / phone again.
  let verified = { orderId: '', phone4: '' };

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
    const couriered = !!item.courierDate;
    const delivered = !!item.deliveredDate;
    return [
      { label: 'Order Placed', done: placed },
      { label: 'Couriered', done: couriered },
      { label: 'Delivered', done: delivered },
    ];
  }

  function feedbackBlockHtml(it, idx){
    const hasFeedback = it.feedback && String(it.feedback).trim().length;
    const currentStars = Number(it.stars) || 0;
    return `
    <div class="feedback-given feedback-block" data-row-token="${escapeHtml(it.rowToken)}" data-idx="${idx}">
      <span class="eyebrow" style="margin-bottom:0.5rem; display:inline-flex;">Your Feedback</span>

      <div class="fb-display" ${hasFeedback ? '' : 'style="display:none;"'}>
        <div class="stars fb-current-stars">${starMarkup(currentStars)}</div>
        <p class="fb-current-text" style="font-style:italic; font-family:'Cormorant Garamond', serif; font-size:1.05rem; margin:0.2rem 0 0;">"${escapeHtml(it.feedback)}"</p>
        <button type="button" class="fb-edit-link">Edit feedback</button>
      </div>

      <p class="fb-empty-note" style="margin:0.2rem 0 0.8rem; font-size:0.85rem; color:#77817c;" ${hasFeedback ? 'style="display:none;"' : ''}>
        No feedback recorded yet for this item.
      </p>

      <form class="fb-form" ${hasFeedback ? 'style="display:none;"' : ''}>
        <div class="star-picker" data-value="${currentStars}">
          ${[1,2,3,4,5].map(n => `<button type="button" data-star="${n}" aria-label="${n} star">★</button>`).join('')}
        </div>
        <textarea class="fb-text" maxlength="1000" placeholder="How was your saree? Fit, colour, fabric, delivery — anything helps.">${hasFeedback ? escapeHtml(it.feedback) : ''}</textarea>
        <div class="fb-actions">
          <button type="submit" class="btn btn-gold fb-submit">Save Feedback</button>
          <button type="button" class="fb-cancel" ${hasFeedback ? '' : 'style="display:none;"'}>Cancel</button>
        </div>
        <p class="fb-note"></p>
      </form>
    </div>`;
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
            <dt>Couriered</dt><dd>${fmtDate(it.courierDate)}</dd>
            <dt>Delivered</dt><dd>${fmtDate(it.deliveredDate)}</dd>
          </dl>

          <div class="status-track">
            ${steps.map(s => `
              <div class="step ${s.done ? 'done' : ''}">
                <div class="dot"></div>
                <div class="label">${s.label}</div>
              </div>`).join('')}
          </div>

          ${feedbackBlockHtml(it, i)}
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

    resultsBox.querySelectorAll('.feedback-block').forEach(wireFeedbackBlock);
  }

  function wireFeedbackBlock(block){
    const display = block.querySelector('.fb-display');
    const emptyNote = block.querySelector('.fb-empty-note');
    const formEl = block.querySelector('.fb-form');
    const editLink = block.querySelector('.fb-edit-link');
    const cancelBtn = block.querySelector('.fb-cancel');
    const picker = block.querySelector('.star-picker');
    const stars = picker.querySelectorAll('button');
    const textEl = block.querySelector('.fb-text');
    const noteEl = block.querySelector('.fb-note');
    const rowToken = block.dataset.rowToken;

    function paintStars(){
      const val = Number(picker.dataset.value) || 0;
      stars.forEach(btn => btn.classList.toggle('on', Number(btn.dataset.star) <= val));
    }
    paintStars();

    stars.forEach(btn => btn.addEventListener('click', () => {
      picker.dataset.value = btn.dataset.star;
      paintStars();
    }));

    function showForm(){
      display.style.display = 'none';
      emptyNote.style.display = 'none';
      formEl.style.display = 'flex';
    }
    function showDisplay(feedbackText, starVal){
      block.querySelector('.fb-current-stars').innerHTML = starMarkup(starVal);
      block.querySelector('.fb-current-text').textContent = '"' + feedbackText + '"';
      display.style.display = 'flex';
      emptyNote.style.display = 'none';
      formEl.style.display = 'none';
      editLink.style.display = 'inline-flex';
    }

    if (editLink) editLink.addEventListener('click', showForm);
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      formEl.style.display = 'none';
      display.style.display = 'flex';
    });

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textEl.value.trim();
      const starVal = Number(picker.dataset.value) || 0;
      noteEl.className = 'fb-note';

      if (!text){
        noteEl.className = 'fb-note show err';
        noteEl.textContent = 'Please write a short note before saving.';
        return;
      }
      if (!starVal){
        noteEl.className = 'fb-note show err';
        noteEl.textContent = 'Please pick a star rating.';
        return;
      }

      const submitBtnEl = formEl.querySelector('.fb-submit');
      submitBtnEl.disabled = true;
      const originalLabel = submitBtnEl.textContent;
      submitBtnEl.textContent = 'Saving…';

      try{
        const res = await callApiPost({
          action: 'submitFeedback',
          orderId: verified.orderId,
          phone4: verified.phone4,
          rowToken,
          feedback: text,
          stars: starVal
        });
        if (res && res.success){
          noteEl.className = 'fb-note show ok';
          noteEl.textContent = 'Thank you — your feedback has been saved.';
          setTimeout(() => showDisplay(text, starVal), 500);
        } else {
          noteEl.className = 'fb-note show err';
          noteEl.textContent = 'Couldn\'t save that just now — please try again.';
        }
      }catch(err){
        noteEl.className = 'fb-note show err';
        noteEl.textContent = err.message === 'CONFIG_MISSING'
          ? 'Feedback saving isn\'t connected yet.'
          : 'Something went wrong saving your feedback. Please try again.';
        console.warn('Feedback submit failed:', err.message);
      }finally{
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = originalLabel;
      }
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
      verified = { orderId, phone4 };
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
