/* Admin chrome: adds edit/add/delete controls over the exact same layout,
   plus modal forms and image uploads. Talks to the REST API in server.js. */
window.ADMIN = true;
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const BASE = window.APP_BASE || '';
  const asset = (u) => { if (!u) return u; if (u[0] === '/' || /^(https?:|data:)/i.test(u)) return u; return BASE + u; };
  const api = {
    save: (method, url, body) => fetch(BASE + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    del: (url) => fetch(BASE + url, { method: 'DELETE' }).then(r => r.json()),
    upload: (file) => { const fd = new FormData(); fd.append('image', file); return fetch(BASE + 'api.php?r=upload', { method: 'POST', body: fd }).then(r => r.json()); },
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- toast ----------
  let toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.append(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ---------- modal ----------
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  document.body.append(backdrop);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  function close() { backdrop.classList.remove('open'); backdrop.innerHTML = ''; }

  // schema: [{name,label,type,options?,hint?}]  type: text|textarea|select|image
  function openForm({ title, fields, values = {}, onSave, extra }) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `<h3>${esc(title)}</h3>` + fields.map(f => fieldHtml(f, values[f.name])).join('') +
      (extra ? `<div id="extra-slot"></div>` : '') +
      `<div class="modal-actions">
         <button class="btn btn-ghost" data-act="cancel">ยกเลิก</button>
         <button class="btn btn-primary" data-act="save">บันทึก</button>
       </div>`;
    backdrop.innerHTML = '';
    backdrop.append(modal);
    backdrop.classList.add('open');

    // wire image pickers
    fields.filter(f => f.type === 'image').forEach(f => wireImage(modal, f.name));
    if (extra) extra($('#extra-slot', modal));

    $('[data-act="cancel"]', modal).addEventListener('click', close);
    $('[data-act="save"]', modal).addEventListener('click', async () => {
      const out = {};
      fields.forEach(f => { out[f.name] = readField(modal, f); });
      try { await onSave(out); close(); reloadPortfolio(); toast('บันทึกแล้ว'); }
      catch (err) { toast('ผิดพลาด: ' + err.message); }
    });
  }

  function fieldHtml(f, val) {
    val = val == null ? '' : val;
    if (f.type === 'textarea')
      return `<div class="field"><label>${esc(f.label)}</label><textarea data-f="${f.name}">${esc(val)}</textarea>${hint(f)}</div>`;
    if (f.type === 'select')
      return `<div class="field"><label>${esc(f.label)}</label><select data-f="${f.name}">${f.options.map(o =>
        `<option value="${esc(o.value)}"${String(o.value) === String(val) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${hint(f)}</div>`;
    if (f.type === 'image')
      return `<div class="field"><label>${esc(f.label)}</label>
        <div class="img-pick">
          <img class="preview" data-prev="${f.name}" src="${val ? esc(asset(val)) : ''}" alt="" ${val ? '' : 'style="visibility:hidden"'}>
          <div style="display:flex;flex-direction:column;gap:6px">
            <input type="file" accept="image/*" data-file="${f.name}">
            <button type="button" class="btn btn-ghost btn-sm" data-clear="${f.name}">ล้างรูป</button>
          </div>
        </div>
        <input type="hidden" data-f="${f.name}" value="${esc(val)}">${hint(f)}</div>`;
    return `<div class="field"><label>${esc(f.label)}</label><input type="text" data-f="${f.name}" value="${esc(val)}">${hint(f)}</div>`;
  }
  const hint = (f) => f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';

  function wireImage(modal, name) {
    const file = modal.querySelector(`[data-file="${name}"]`);
    const hidden = modal.querySelector(`input[data-f="${name}"]`);
    const prev = modal.querySelector(`[data-prev="${name}"]`);
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      toast('กำลังอัปโหลด...');
      const { url, error } = await api.upload(file.files[0]);
      if (error) return toast('อัปโหลดไม่สำเร็จ: ' + error);
      hidden.value = url; prev.src = asset(url); prev.style.visibility = 'visible';
      toast('อัปโหลดรูปแล้ว');
    });
    modal.querySelector(`[data-clear="${name}"]`).addEventListener('click', () => {
      hidden.value = ''; prev.src = ''; prev.style.visibility = 'hidden';
    });
  }
  function readField(modal, f) {
    const node = modal.querySelector(`[data-f="${f.name}"]`);
    return node ? node.value : '';
  }

  function confirmDel(label, fn) {
    if (confirm('ลบ "' + label + '" ?')) fn();
  }

  // ---------- edit chrome per view ----------
  const AdminChrome = {
    decorate(tab, state, host) {
      if (tab === 'works') decorateWorksGrid(host);
      else if (tab === 'services') decorateServices(host);
      else if (tab === 'clients') decorateClients(host);
      else if (tab === 'exp') decorateExp(host);
      else if (tab === 'contact') decorateContact(host);
    },
  };
  AdminChrome.editWork = (w) => workForm(w);
  window.AdminChrome = AdminChrome;

  function tagFor(el, editFn, delFn) {
    const tag = document.createElement('div');
    tag.className = 'edit-tag';
    tag.innerHTML = `<button data-e>แก้ไข</button>${delFn ? '<button data-d>ลบ</button>' : ''}`;
    tag.querySelector('[data-e]').addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); editFn(); });
    if (delFn) tag.querySelector('[data-d]').addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); delFn(); });
    el.style.position = 'relative';
    el.append(tag);
  }
  function addButton(host, label, fn) {
    const wrap = document.createElement('div');
    wrap.className = 'add-row';
    const b = document.createElement('button');
    b.className = 'dashed-add'; b.textContent = label;
    b.addEventListener('click', fn);
    wrap.append(b); host.append(wrap);
  }

  // ---- Works ----
  const WORK_TAGS_HINT = 'คั่นแต่ละแท็กด้วยเครื่องหมายจุลภาค (,) เช่น MS Word, Canva';
  function workForm(w) {
    openForm({
      title: w ? 'แก้ไขผลงาน' : 'เพิ่มผลงาน',
      fields: [
        { name: 'title', label: 'ชื่อผลงาน', type: 'text' },
        { name: 'tags', label: 'แท็ก / เครื่องมือ', type: 'text', hint: WORK_TAGS_HINT },
        { name: 'category', label: 'หมวดหมู่', type: 'text', hint: 'ใช้จัดกลุ่มในตัวกรอง เช่น คู่มือ, รายงาน, เอกสาร, ฐานข้อมูล' },
        { name: 'thumb', label: 'รูปหน้าปก (grid)', type: 'image' },
        { name: 'description', label: 'คำอธิบาย', type: 'textarea' },
        { name: 'cta_label', label: 'ปุ่มลิงก์ด้านล่าง (ข้อความ)', type: 'text', hint: 'เว้นว่าง = ไม่แสดงปุ่ม' },
        { name: 'cta_url', label: 'ปุ่มลิงก์ด้านล่าง (URL)', type: 'text', hint: 'เช่น https://line.me/..., mailto:, tel:' },
      ],
      values: w ? { ...w, tags: (w.tags || []).join(', ') } : {},
      onSave: async (out) => {
        out.tags = out.tags.split(',').map(s => s.trim()).filter(Boolean);
        if (w) await api.save('PUT', 'api.php?r=works&id=' + w.id, out);
        else await api.save('POST', 'api.php?r=works', out);
      },
      extra: w ? (slot) => renderWorkImages(slot, w) : null,
    });
  }
  function renderWorkImages(slot, w) {
    slot.innerHTML = `<div class="field"><label>รูปในแกลเลอรี (สูงสุด 5 ภาพ · ${(w.images || []).length}/5)</label></div>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    (w.images || []).forEach((im) => {
      const row = document.createElement('div');
      row.className = 'img-pick';
      row.innerHTML = `<img class="preview" src="${im.url ? esc(asset(im.url)) : ''}" ${im.url ? '' : 'style="visibility:hidden"'}>
        <div style="display:flex;flex-direction:column;gap:6px">
          <input type="file" accept="image/*">
          <button type="button" class="btn btn-danger btn-sm">ลบรูปนี้</button>
        </div>`;
      const fileInput = row.querySelector('input');
      const prev = row.querySelector('.preview');
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files[0]) return;
        const { url, error } = await api.upload(fileInput.files[0]);
        if (error) return toast(error);
        await api.save('PUT', 'api.php?r=work_images&id=' + im.id, { url });
        prev.src = asset(url); prev.style.visibility = 'visible'; im.url = url; toast('อัปเดตรูปแล้ว');
      });
      row.querySelector('button').addEventListener('click', async () => {
        await api.del('api.php?r=work_images&id=' + im.id);
        row.remove(); toast('ลบรูปแล้ว');
      });
      list.append(row);
    });
    slot.append(list);
    const add = document.createElement('button');
    add.className = 'btn btn-ghost btn-sm'; add.textContent = '+ เพิ่มรูป'; add.style.marginTop = '8px';
    add.addEventListener('click', async () => {
      if ((w.images || []).length >= 5) { toast('แนบได้สูงสุด 5 ภาพ'); return; }
      const { id } = await api.save('POST', 'api.php?r=work_images&work_id=' + w.id, { url: '' });
      w.images.push({ id, url: '' });
      renderWorkImages(slot, w);
    });
    slot.append(add);
  }
  function decorateWorksGrid(host) {
    host.querySelectorAll('.work-cell').forEach((cell) => {
      const id = +cell.dataset.workId;
      const w = DATA.works.find(x => x.id === id);
      tagFor(cell, () => workForm(w), () => confirmDel(w.title, async () => { await api.del('api.php?r=works&id=' + id); reloadPortfolio(); toast('ลบแล้ว'); }));
      const vb = document.createElement('div'); vb.className = 'view-badge'; vb.textContent = '👁 ' + (w.views || 0); cell.append(vb);
    });
    addButton(host, '+ เพิ่มผลงาน', () => workForm(null));
  }
  function decorateWorkDetail(host, state) {
    const w = DATA.works[state.work - 1];
    if (!w) return;
    const bar = document.createElement('div');
    bar.className = 'edit-controls';
    bar.innerHTML = `<button class="btn btn-ghost btn-sm">แก้ไขผลงานนี้ (รวมรูปแกลเลอรี)</button>`;
    bar.querySelector('button').addEventListener('click', () => workForm(w));
    host.append(bar);
  }

  function renderServiceImages(slot, s) {
    slot.innerHTML = `<div class="field"><label>รูปผลงานของบริการ (สูงสุด 5 ภาพ · ${(s.images || []).length}/5) — คลิกบริการหน้าเว็บเพื่อดูภาพ</label></div>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px';
    (s.images || []).forEach((im) => {
      const row = document.createElement('div');
      row.className = 'img-pick';
      row.innerHTML = `<img class="preview" src="${im.url ? esc(asset(im.url)) : ''}" ${im.url ? '' : 'style="visibility:hidden"'}>
        <div style="display:flex;flex-direction:column;gap:6px">
          <input type="file" accept="image/*">
          <button type="button" class="btn btn-danger btn-sm">ลบรูปนี้</button>
        </div>`;
      const fileInput = row.querySelector('input');
      const prev = row.querySelector('.preview');
      fileInput.addEventListener('change', async () => {
        if (!fileInput.files[0]) return;
        const { url, error } = await api.upload(fileInput.files[0]);
        if (error) return toast(error);
        await api.save('PUT', 'api.php?r=service_images&id=' + im.id, { url });
        prev.src = asset(url); prev.style.visibility = 'visible'; im.url = url; toast('อัปเดตรูปแล้ว');
      });
      row.querySelector('button').addEventListener('click', async () => {
        await api.del('api.php?r=service_images&id=' + im.id);
        row.remove(); toast('ลบรูปแล้ว');
      });
      list.append(row);
    });
    slot.append(list);
    if ((s.images || []).length < 5) {
      const add = document.createElement('button');
      add.className = 'btn btn-ghost btn-sm'; add.textContent = '+ เพิ่มรูป'; add.style.marginTop = '8px';
      add.addEventListener('click', async () => {
        const { id } = await api.save('POST', 'api.php?r=service_images&service_id=' + s.id, { url: '' });
        s.images = s.images || []; s.images.push({ id, url: '' });
        renderServiceImages(slot, s);
      });
      slot.append(add);
    }
  }

  // ---- Services ----
  function serviceForm(s) {
    openForm({
      title: s ? 'แก้ไขบริการ' : 'เพิ่มบริการ',
      fields: [
        { name: 'icon', label: 'ไอคอน', type: 'select', options: [
          { value: 'document', label: 'เอกสาร' }, { value: 'table', label: 'ตาราง' }, { value: 'chart', label: 'กราฟ' }] },
        { name: 'title', label: 'ชื่อบริการ', type: 'text' },
        { name: 'subtitle', label: 'รายละเอียด / ราคา', type: 'text' },
      ],
      values: s || {},
      onSave: (out) => s ? api.save('PUT', 'api.php?r=services&id=' + s.id, out) : api.save('POST', 'api.php?r=services', out),
      extra: s ? (slot) => renderServiceImages(slot, s) : null,
    });
  }
  function decorateServices(host) {
    host.querySelectorAll('.service-row').forEach((row) => {
      const id = +row.dataset.serviceId;
      const s = DATA.services.find(x => x.id === id);
      tagFor(row, () => serviceForm(s), () => confirmDel(s.title, async () => { await api.del('api.php?r=services&id=' + id); reloadPortfolio(); }));
    });
    addButton(host, '+ เพิ่มบริการ', () => serviceForm(null));
  }

  // ---- Clients ----
  function clientForm(c) {
    openForm({
      title: c ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้า',
      fields: [
        { name: 'name', label: 'ชื่อ', type: 'text' },
        { name: 'logo', label: 'โลโก้', type: 'image' },
      ],
      values: c || {},
      onSave: (out) => c ? api.save('PUT', 'api.php?r=clients&id=' + c.id, out) : api.save('POST', 'api.php?r=clients', out),
    });
  }
  function decorateClients(host) {
    const clients = DATA.clients;
    host.querySelectorAll('.client-cell').forEach((cell, idx) => {
      const id = +cell.dataset.clientId;
      const c = clients.find(x => x.id === id);
      tagFor(cell, () => clientForm(c), () => confirmDel(c.name, async () => { await api.del('api.php?r=clients&id=' + id); reloadPortfolio(); }));
      const bar = document.createElement('div');
      bar.className = 'reorder-bar';
      bar.innerHTML = `<button data-up ${idx === 0 ? 'disabled' : ''}>↑</button><button data-down ${idx === clients.length - 1 ? 'disabled' : ''}>↓</button>`;
      bar.querySelector('[data-up]').addEventListener('click', (e) => { e.stopPropagation(); moveItem('clients', clients, idx, idx - 1); });
      bar.querySelector('[data-down]').addEventListener('click', (e) => { e.stopPropagation(); moveItem('clients', clients, idx, idx + 1); });
      cell.append(bar);
    });
    addButton(host, '+ เพิ่มลูกค้า', () => clientForm(null));
  }
  async function moveItem(resource, arr, from, to) {
    if (to < 0 || to >= arr.length) return;
    const list = arr.slice();
    const [m] = list.splice(from, 1); list.splice(to, 0, m);
    await Promise.all(list.map((it, i) => api.save('PUT', 'api.php?r=' + resource + '&id=' + it.id, { sort_order: i })));
    reloadPortfolio(); toast('จัดลำดับแล้ว');
  }

  // ---- Experience ----
  function expForm(e) {
    openForm({
      title: e ? 'แก้ไขประสบการณ์' : 'เพิ่มประสบการณ์',
      fields: [
        { name: 'title', label: 'ตำแหน่ง / หัวข้อ', type: 'text' },
        { name: 'period', label: 'ช่วงเวลา / รายละเอียด', type: 'text' },
        { name: 'summary', label: 'สรุป', type: 'textarea', hint: 'เว้นว่างได้ (เช่น รายการการศึกษา)' },
        { name: 'is_edu', label: 'ประเภท', type: 'select', options: [
          { value: 0, label: 'ประสบการณ์ทำงาน (จุดสีน้ำเงิน)' }, { value: 1, label: 'การศึกษา (จุดสีจาง, ไม่มีเส้นต่อ)' }] },
      ],
      values: e || {},
      onSave: (out) => e ? api.save('PUT', 'api.php?r=experiences&id=' + e.id, out) : api.save('POST', 'api.php?r=experiences', out),
      extra: e ? (slot) => renderExpProjects(slot, e) : null,
    });
  }
  function renderExpProjects(slot, e) {
    slot.innerHTML = `<div class="field"><label>โปรเจคที่เคยทำ (แนบโลโก้ได้)</label></div>`;
    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    (e.projects || []).forEach((p) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center';
      row.innerHTML = `
        <img class="proj-logo-prev" src="${p.logo ? esc(asset(p.logo)) : ''}" style="width:38px;height:38px;border-radius:8px;object-fit:cover;background:var(--tile);border:1px solid var(--border);flex:none${p.logo ? '' : ';visibility:hidden'}">
        <input type="file" accept="image/*" data-logo style="display:none">
        <button type="button" class="btn btn-ghost btn-sm" data-pick style="flex:none">โลโก้</button>
        <div style="flex:1;min-width:0">
          <input type="text" data-n value="${esc(p.name)}" placeholder="ชื่อโปรเจค" style="width:100%;margin-bottom:4px;border:1px solid #d5e2f5;border-radius:8px;padding:6px 9px;font-family:inherit">
          <input type="text" data-m value="${esc(p.meta)}" placeholder="หน่วยงาน · บทบาท" style="width:100%;border:1px solid #d5e2f5;border-radius:8px;padding:6px 9px;font-family:inherit">
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-save style="flex:none">บันทึก</button>
        <button type="button" class="btn btn-danger btn-sm" data-del style="flex:none">ลบ</button>`;
      const prev = row.querySelector('.proj-logo-prev');
      const file = row.querySelector('[data-logo]');
      row.querySelector('[data-pick]').addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        if (!file.files[0]) return;
        toast('กำลังอัปโหลด...');
        const { url, error } = await api.upload(file.files[0]);
        if (error) return toast('อัปโหลดไม่สำเร็จ: ' + error);
        p.logo = url; prev.src = asset(url); prev.style.visibility = 'visible';
        await api.save('PUT', 'api.php?r=exp_projects&id=' + p.id, { logo: url });
        toast('อัปโหลดโลโก้แล้ว');
      });
      row.querySelector('[data-save]').addEventListener('click', async () => {
        await api.save('PUT', 'api.php?r=exp_projects&id=' + p.id, { name: row.querySelector('[data-n]').value, meta: row.querySelector('[data-m]').value });
        toast('บันทึกโปรเจคแล้ว');
      });
      row.querySelector('[data-del]').addEventListener('click', async () => { await api.del('api.php?r=exp_projects&id=' + p.id); row.remove(); toast('ลบแล้ว'); });
      list.append(row);
    });
    slot.append(list);
    const add = document.createElement('button');
    add.className = 'btn btn-ghost btn-sm'; add.textContent = '+ เพิ่มโปรเจค'; add.style.marginTop = '8px';
    add.addEventListener('click', async () => {
      const { id } = await api.save('POST', 'api.php?r=exp_projects&exp_id=' + e.id, { name: 'โปรเจคใหม่', meta: '' });
      e.projects = e.projects || []; e.projects.push({ id, name: 'โปรเจคใหม่', meta: '', logo: '' });
      renderExpProjects(slot, e);
    });
    slot.append(add);
  }
  function decorateExp(host) {
    host.querySelectorAll('.exp-entry').forEach((entry) => {
      const id = +entry.dataset.expId;
      const e = DATA.experiences.find(x => x.id === id);
      const body = entry.querySelector('.exp-body');
      const ctl = document.createElement('div');
      ctl.className = 'edit-controls';
      ctl.innerHTML = `<button class="btn btn-ghost btn-sm" data-e>แก้ไข</button><button class="btn btn-danger btn-sm" data-d>ลบ</button>`;
      ctl.querySelector('[data-e]').addEventListener('click', () => expForm(e));
      ctl.querySelector('[data-d]').addEventListener('click', () => confirmDel(e.title, async () => { await api.del('api.php?r=experiences&id=' + id); reloadPortfolio(); }));
      body.append(ctl);
    });
    addButton(host, '+ เพิ่มประสบการณ์', () => expForm(null));
  }

  // ---- Contact ----
  function contactForm(c, grp) {
    openForm({
      title: c ? 'แก้ไขช่องทางติดต่อ' : 'เพิ่มช่องทางติดต่อ',
      fields: [
        { name: 'grp', label: 'กลุ่ม', type: 'select', options: [
          { value: 'contact', label: 'ติดต่อ' }, { value: 'social', label: 'โซเชียล' }] },
        { name: 'icon', label: 'ไอคอน', type: 'select', options: window.CONTACT_ICONS.map(i => ({ value: i, label: i })) },
        { name: 'label', label: 'ป้ายกำกับ', type: 'text', hint: 'เช่น อีเมล, LINE ID' },
        { name: 'value', label: 'ค่าที่แสดง', type: 'text' },
        { name: 'href', label: 'ลิงก์ (href)', type: 'text', hint: 'เช่น mailto:.., tel:.., https://..' },
        { name: 'sort_order', label: 'ลำดับการแสดง', type: 'text', hint: 'เลขน้อย = แสดงก่อน (เช่น LINE=0, เบอร์=1, อีเมล=2)' },
      ],
      values: c || { grp: grp || 'contact' },
      onSave: (out) => c ? api.save('PUT', 'api.php?r=contacts&id=' + c.id, out) : api.save('POST', 'api.php?r=contacts', out),
    });
  }
  function decorateContact(host) {
    host.querySelectorAll('.contact-row').forEach((row) => {
      const id = +row.dataset.contactId;
      const c = DATA.contacts.find(x => x.id === id);
      tagFor(row, () => contactForm(c), () => confirmDel(c.label, async () => { await api.del('api.php?r=contacts&id=' + id); reloadPortfolio(); }));
    });
    addButton(host, '+ เพิ่มช่องทางติดต่อ', () => contactForm(null, 'contact'));
  }

  // ---- profile edit button (header) ----
  document.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.edit === 'profile') {
      const p = DATA.profile || {};
      openForm({
        title: 'แก้ไขโปรไฟล์',
        fields: [
          { name: 'photo', label: 'รูปโปรไฟล์', type: 'image' },
          { name: 'name', label: 'ชื่อ', type: 'text' },
          { name: 'bio', label: 'คำแนะนำตัว', type: 'textarea' },
          { name: 'footer', label: 'ข้อความท้ายหน้า', type: 'text' },
          { name: 'clients_intro', label: 'ข้อความใต้หัวข้อ "ลูกค้าที่ไว้วางใจ"', type: 'textarea', hint: 'อธิบายประเภทงาน/ลูกค้า โทนน่าเชื่อถือ' },
        ],
        values: p,
        onSave: (out) => api.save('PUT', 'api.php?r=profile', out),
      });
    }
  });
})();
