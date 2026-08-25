/* Shared portfolio renderer — drives both the public page and the admin page.
   Set window.ADMIN = true before this runs to enable edit chrome. */
(function () {
  const ADMIN = !!window.ADMIN;
  const BASE = window.APP_BASE || '';
  const asset = (u) => { if (!u) return u; if (u[0] === '/' || /^(https?:|data:)/i.test(u)) return u; return BASE + u; };

  // ---------- inline SVG icon set (stroke #1877f2, width 2) ----------
  const S = (p, extra = '') =>
    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round" ${extra}>${p}</svg>`;
  const ICONS = {
    // service icons
    document: S('<path d="M6 3h9l4 4v14H6z"></path><path d="M9 12h7M9 16h7M9 8h3"></path>'),
    table: S('<path d="M4 5h16v14H4z"></path><path d="M4 10h16M9 5v14"></path>'),
    chart: S('<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"></path>'),
    // project org icon
    building: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round"><path d="M4 21V5l8-3v19M12 21h8V9l-8-3"></path><path d="M7 9h2M7 13h2M7 17h2"></path></svg>',
    // contact icons (20px)
    mail: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>',
    phone: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round"><path d="M4 4h5l2 5-3 2a13 13 0 006 6l2-3 5 2v5a2 2 0 01-2 2A17 17 0 012 6a2 2 0 012-2z"></path></svg>',
    line: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1 0-2-.17-2.9-.5L5 21l1-3.6A8.5 8.5 0 1121 11.5z"></path></svg>',
    instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.2" cy="6.8" r="0.6" fill="#1877f2"></circle></svg>',
    facebook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0022 12z"></path></svg>',
    tiktok: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1877f2" stroke-width="2" stroke-linecap="round"><path d="M9 12a4 4 0 104 4V4c.5 2.5 2.5 4.5 5 5"></path></svg>',
  };
  window.CONTACT_ICONS = ['mail', 'phone', 'line', 'instagram', 'facebook', 'tiktok'];
  window.SERVICE_ICONS = ['document', 'table', 'chart'];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // image or dashed placeholder
  function media(url, cls, placeholder) {
    if (url) return `<div class="${cls}"><img src="${esc(asset(url))}" alt="" loading="lazy" decoding="async"></div>`;
    return `<div class="${cls} slot">${esc(placeholder || '')}</div>`;
  }

  // ข้อความมีรูปแบบ: **ตัวหนา**, [ข้อความ](ลิงก์), ขึ้นบรรทัดด้วย Enter
  function formatText(str) {
    let h = esc(str || '');
    h = h.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, t, u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'; });
    h = h.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
    return h;
  }

  const state = { tab: 'works', work: 0, workCat: 'all', expOpen: {}, dots: {} };
  let DATA = null;

  async function load() {
    const res = await fetch(BASE + 'api.php?r=portfolio');
    DATA = await res.json();
    window.DATA = DATA;
    renderHeader();
    renderTabs();
    renderContent();
    let _wid = new URLSearchParams(location.search).get('w');
    if (!_wid) { const _p = location.pathname.split('/w/')[1]; if (_p) _wid = parseInt(_p, 10) || ''; }
    if (_wid) { const _w = (DATA.works || []).find((x) => String(x.id) === String(_wid)); if (_w) { state.tab = 'works'; renderTabs(); renderContent(); openWorkScreen(_w); } }
    document.dispatchEvent(new CustomEvent('portfolio:loaded'));
  }
  window.reloadPortfolio = load;
  const pingView = (t, id) => { try { fetch(BASE + 'api.php?r=view&t=' + t + '&id=' + id, { method: 'POST' }); } catch (e) {} };

  // ---------- header ----------
  function renderHeader() {
    const p = DATA.profile || {};
    const host = document.getElementById('header');
    const avatar = p.photo
      ? `<img class="avatar" src="${esc(asset(p.photo))}" alt="${esc(p.name)}">`
      : `<div class="avatar slot">รูปโปรไฟล์</div>`;
    host.innerHTML = `
      ${avatar}
      <span class="name">${esc(p.name)}</span>
      <p class="bio">${esc(p.bio)}</p>
      ${ADMIN ? `<div class="edit-controls"><button class="btn btn-ghost btn-sm" data-edit="profile">แก้ไขโปรไฟล์</button></div>` : ''}`;
    const foot = document.getElementById('footer');
    if (foot) foot.textContent = p.footer || '© Maywipa.am · Portfolio';
  }

  const TABS = [
    ['works', 'ผลงาน'], ['services', 'บริการ'], ['clients', 'ลูกค้า'],
    ['exp', 'ประสบการณ์'], ['contact', 'ติดต่อ'],
  ];
  function renderTabs() {
    const host = document.getElementById('tabs');
    host.innerHTML = TABS.map(([k, label]) =>
      `<button class="tab${state.tab === k ? ' active' : ''}" data-tab="${k}">${label}</button>`).join('');
    host.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      if (state.tab === 'works') state.work = 0;
      renderTabs();
      renderContent();
    }));
  }

  // ---------- content router ----------
  function renderContent() {
    const host = document.getElementById('content');
    host.innerHTML = '';
    if (state.tab === 'works') host.append(worksGrid());
    else if (state.tab === 'services') host.append(servicesView());
    else if (state.tab === 'clients') host.append(clientsView());
    else if (state.tab === 'exp') host.append(expView());
    else if (state.tab === 'contact') host.append(contactView());
    if (ADMIN && window.AdminChrome) window.AdminChrome.decorate(state.tab, state, host);
  }
  window.rerenderContent = renderContent;
  window.portfolioState = state;

  const frag = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content; };
  const div = (cls) => { const d = document.createElement('div'); if (cls) d.className = cls; return d; };

  // ---------- works ----------
  function worksGrid() {
    const wrap = div('view');

    // หัวข้อ + ตัวกรองหมวดหมู่
    const cats = [...new Set(DATA.works.map((w) => w.category).filter(Boolean))];
    if (state.workCat !== 'all' && !cats.includes(state.workCat)) state.workCat = 'all';
    const head = frag(`
      <div class="section-head works-head">
        <span class="section-title">ผลงาน</span>
        <select class="cat-filter" aria-label="ตัวกรองหมวดหมู่"></select>
      </div>`).firstElementChild;
    const sel = head.querySelector('.cat-filter');
    sel.innerHTML = '<option value="all">All</option>' +
      cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    sel.value = state.workCat;
    sel.addEventListener('change', () => { state.workCat = sel.value; renderContent(); });
    wrap.append(head);

    const grid = div('works-grid');
    DATA.works.forEach((w, i) => {
      if (state.workCat !== 'all' && w.category !== state.workCat) return;
      const cell = frag(`
        <div class="work-cell editable" data-work-id="${w.id}">
          ${media(w.thumb, 'work-thumb', 'ผลงาน ' + (i + 1))}
        </div>`).firstElementChild;
      cell.addEventListener('click', () => openWorkScreen(w));
      grid.append(cell);
    });
    wrap.append(grid);
    return wrap;
  }

  // ---------- work detail: หน้าเต็มจอแยก ----------
  function openWorkScreen(w) {
    document.querySelectorAll('.work-screen, .ws-backdrop').forEach((n) => n.remove());
    pingView('work', w.id);
    const filled = (w.images || []).filter((im) => im.url);
    const imgs = filled.length ? filled : [{ url: '' }];
    const backdrop = div('ws-backdrop');
    const scr = div('work-screen');
    scr.innerHTML = `
      <div class="ws-scroll">
        <div class="ws-hero">
          <button class="ws-close" aria-label="ปิด">✕</button>
          <button class="ws-share" aria-label="แชร์"><svg viewBox="0 0 24 24" fill="none" stroke="#17233a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"></path></svg></button>
          <div class="ws-carousel"></div>
          <div class="ws-dots"></div>
        </div>
        <div class="ws-body">
          <h2 class="ws-title">${esc(w.title)}</h2>
          <p class="ws-desc">${formatText(w.description)}</p>
        </div>
      </div>`;

    const car = scr.querySelector('.ws-carousel');
    imgs.forEach((im, i) => {
      const inner = im.url
        ? `<img src="${esc(asset(im.url))}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`
        : `<div class="ws-empty">ภาพที่ ${i + 1}</div>`;
      const slide = frag(`<div class="ws-slide">${inner}</div>`).firstElementChild;
      car.append(slide);
    });

    // ลาก/ปัดเพื่อสไลด์ · แตะเพื่อดูรูปใหญ่
    let _d = false, _sx = 0, _sl = 0, _moved = 0;
    car.addEventListener('pointerdown', (e) => { _sx = e.clientX; _moved = 0; if (e.pointerType === 'mouse') { _d = true; _sl = car.scrollLeft; car.classList.add('drag'); } });
    car.addEventListener('pointermove', (e) => { _moved = Math.max(_moved, Math.abs(e.clientX - _sx)); if (_d) car.scrollLeft = _sl - (e.clientX - _sx); });
    const _end = () => { _d = false; car.classList.remove('drag'); };
    car.addEventListener('pointerup', _end); car.addEventListener('pointercancel', _end); car.addEventListener('pointerleave', _end);
    car.querySelectorAll('.ws-slide').forEach((sl, i) => sl.addEventListener('click', () => { if (_moved < 8) openLightbox(imgs, i); }));

    const dots = scr.querySelector('.ws-dots');
    if (imgs.length > 1) {
      imgs.forEach((_, i) => dots.append(frag(`<span class="dot${i === 0 ? ' active' : ''}"></span>`)));
      car.addEventListener('scroll', () => {
        const first = car.firstElementChild;
        if (!first) return;
        const idx = Math.max(0, Math.min(imgs.length - 1, Math.round(car.scrollLeft / first.offsetWidth)));
        dots.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
      });
    }

    if (ADMIN && window.AdminChrome && window.AdminChrome.editWork) {
      const eb = frag(`<button class="ws-edit">แก้ไขผลงานนี้</button>`).firstElementChild;
      eb.addEventListener('click', () => window.AdminChrome.editWork(w));
      scr.querySelector('.ws-body').append(eb);
    }

    if (w.cta_url) {
      const bottom = frag(`<div class="ws-bottom"><a class="ws-cta" href="${esc(w.cta_url)}" target="_blank" rel="noopener">${esc(w.cta_label || 'ติดต่อสอบถาม')}</a></div>`).firstElementChild;
      scr.append(bottom);
    }

    const close = () => {
      scr.remove(); backdrop.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    scr.querySelector('.ws-close').addEventListener('click', close);
    scr.querySelector('.ws-share').addEventListener('click', () => {
      const url = location.origin + '/w/' + w.id;
      const data = { title: w.title, text: w.title + ' · Maywipa.am', url };
      if (navigator.share) navigator.share(data).catch(() => {});
      else if (navigator.clipboard) { navigator.clipboard.writeText(url); toastMsg('คัดลอกลิงก์แล้ว'); }
      else prompt('คัดลอกลิงก์นี้', url);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop, scr);
    document.body.style.overflow = 'hidden';
  }

  // ---------- services ----------
  function servicesView() {
    const wrap = div('services');
    DATA.services.forEach((s) => {
      const imgs = (s.images || []).filter((im) => im.url);
      const row = frag(`
        <div class="service-row editable${imgs.length ? ' has-images' : ''}" data-service-id="${s.id}">
          <div class="icon-tile">${ICONS[s.icon] || ICONS.document}</div>
          <div class="service-text">
            <span class="service-title">${esc(s.title)}</span>
            <span class="service-sub">${esc(s.subtitle)}</span>
            ${imgs.length ? '<span class="service-view">ดูตัวอย่างผลงาน ›</span>' : ''}
          </div>
        </div>`).firstElementChild;
      if (imgs.length) row.addEventListener('click', () => { pingView('service', s.id); openLightbox(imgs, 0); });
      wrap.append(row);
    });
    return wrap;
  }

  // ---------- clients ----------
  function clientsView() {
    const wrap = div('clients-wrap');
    const grid = div('clients-grid');
    DATA.clients.forEach((c) => {
      grid.append(frag(`
        <div class="client-cell editable" data-client-id="${c.id}">
          ${media(c.logo, 'client-logo', 'โลโก้')}
        </div>`));
    });
    wrap.append(grid);
    return wrap;
  }

  // ---------- experience ----------
  function expView() {
    const wrap = div('timeline');
    DATA.experiences.forEach((e, idx) => {
      const last = idx === DATA.experiences.length - 1;
      const entry = div('exp-entry');
      entry.dataset.expId = e.id;
      entry.classList.add('editable');
      const rail = frag(`<div class="exp-rail"><div class="exp-dot${e.is_edu ? ' edu' : ''}"></div>${last ? '' : '<div class="exp-connector"></div>'}</div>`);
      entry.append(rail);
      const body = div('exp-body' + (last ? ' last' : ''));
      body.append(frag(`<span class="exp-title">${esc(e.title)}</span><span class="exp-period">${esc(e.period)}</span>`));
      if (e.summary) body.append(frag(`<span class="exp-summary">${esc(e.summary)}</span>`));
      if (e.projects && e.projects.length) {
        const open = !!state.expOpen[e.id];
        const toggle = frag(`<div class="exp-toggle${open ? ' open' : ''}"><span>โปรเจคที่เคยทำ</span><span class="caret">▾</span></div>`).firstElementChild;
        const list = div('exp-projects');
        list.hidden = !open;
        e.projects.forEach((p) => list.append(frag(`
          <div class="proj-row">
            <div class="proj-left">
              <div class="proj-icon">${p.logo ? `<img src="${esc(asset(p.logo))}" alt="" loading="lazy">` : ICONS.building}</div>
              ${p.year ? `<span class="proj-year">${esc(p.year)}</span>` : ''}
            </div>
            <div class="proj-text">
              <span class="proj-name">${esc(p.name)}</span>
              ${p.org ? `<div class="proj-line"><span class="proj-k">ให้แก่</span><span class="proj-c">:</span><span class="proj-v">${esc(p.org)}</span></div>` : ''}
              ${p.role ? `<div class="proj-line"><span class="proj-k">บทบาท</span><span class="proj-c">:</span><span class="proj-v">${esc(p.role)}</span></div>` : ''}
              ${(!p.org && !p.role && p.meta) ? `<span class="proj-meta">${esc(p.meta)}</span>` : ''}
              ${p.responsibility ? `<div class="proj-line"><span class="proj-k">หน้าที่</span><span class="proj-c">:</span><span class="proj-v">${esc(p.responsibility)}</span></div>` : ''}
            </div>
          </div>`)));
        toggle.addEventListener('click', () => {
          state.expOpen[e.id] = !state.expOpen[e.id];
          list.hidden = !state.expOpen[e.id];
          toggle.classList.toggle('open', state.expOpen[e.id]);
        });
        body.append(toggle, list);
      }
      entry.append(body);
      wrap.append(entry);
    });
    return wrap;
  }

  // ---------- contact ----------
  function contactView() {
    const wrap = div('contact-wrap');
    const groups = [['contact', 'ติดต่อ'], ['social', 'โซเชียล']];
    groups.forEach(([g, label], gi) => {
      const rows = DATA.contacts.filter((c) => c.grp === g);
      if (!rows.length && !ADMIN) return;
      wrap.append(frag(`<span class="section-label${gi ? ' contact-social-label' : ''}">${label}</span>`));
      rows.forEach((c) => {
        const tag = ADMIN ? 'div' : 'a';
        const row = frag(`
          <${tag} class="contact-row editable" data-contact-id="${c.id}" ${ADMIN ? '' : `href="${esc(c.href)}"`}>
            ${ICONS[c.icon] || ICONS.mail}
            <div class="contact-text"><span class="contact-label">${esc(c.label)}</span><span class="contact-value">${esc(c.value)}</span></div>
          </${tag}>`).firstElementChild;
        wrap.append(row);
      });
    });
    return wrap;
  }

  // ---------- fullscreen image viewer (drag/swipe to change) ----------
  function openLightbox(images, start) {
    const ov = div('lightbox');
    ov.innerHTML = '<button class="lb-close" aria-label="ปิด">✕</button><div class="lb-track"></div>';
    const track = ov.querySelector('.lb-track');
    images.forEach((im, i) => {
      const s = document.createElement('div');
      s.className = 'lb-slide';
      s.innerHTML = im.url ? `<img src="${esc(asset(im.url))}" alt="" draggable="false">` : `<div class="lb-empty">ภาพที่ ${i + 1}</div>`;
      track.append(s);
    });
    track.querySelectorAll('.lb-slide img').forEach((im) => attachZoom(im));
    document.body.append(ov);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { track.scrollLeft = (start || 0) * track.clientWidth; });
    const close = () => { ov.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    ov.querySelector('.lb-close').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target === track) close(); });
    document.addEventListener('keydown', onKey);
    // drag with mouse to scroll (touch swipes natively)
    let down = false, sx = 0, sl = 0, moved = 0;
    track.addEventListener('pointerdown', (e) => { down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft; track.classList.add('drag'); });
    track.addEventListener('pointermove', (e) => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); track.scrollLeft = sl - dx; });
    const end = () => { down = false; track.classList.remove('drag'); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('pointerleave', end);
  }

  function toastMsg(m) {
    let t = document.querySelector('.mini-toast');
    if (!t) { t = document.createElement('div'); t.className = 'mini-toast'; document.body.append(t); }
    t.textContent = m; t.classList.add('show');
    clearTimeout(toastMsg._t); toastMsg._t = setTimeout(() => t.classList.remove('show'), 1600);
  }

  function attachZoom(img) {
    let scale = 1, tx = 0, ty = 0, drag = false, sx = 0, sy = 0, lastTap = 0;
    const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; img.style.touchAction = scale > 1 ? 'none' : 'manipulation'; };
    img.addEventListener('click', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) { e.stopPropagation();
        if (scale > 1) { scale = 1; tx = 0; ty = 0; } else { scale = 2.4; }
        apply();
      }
      lastTap = now;
    });
    img.addEventListener('pointerdown', (e) => { if (scale <= 1) return; e.stopPropagation(); drag = true; sx = e.clientX - tx; sy = e.clientY - ty; });
    img.addEventListener('pointermove', (e) => { if (!drag) return; e.stopPropagation(); tx = e.clientX - sx; ty = e.clientY - sy; apply(); });
    const end = () => { drag = false; };
    img.addEventListener('pointerup', end); img.addEventListener('pointercancel', end);
  }

  document.addEventListener('DOMContentLoaded', load);
})();
