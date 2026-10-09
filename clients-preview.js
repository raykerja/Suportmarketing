// Pratinjau klien aktif, PIC Visit, dan penawaran ulang; dashboard membaca ringkasan Sales Visit yang sudah dimuat aplikasi.
(() => {
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const day = (offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const displayDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : 'Belum dijadwalkan';
  const stages = {
    review: 'Perlu review', proposal: 'Menyiapkan penawaran', sent: 'Penawaran terkirim',
    follow_up: 'Negosiasi / follow up', won: 'Disetujui', lost: 'Tidak lanjut'
  };
  const clients = [
    { id: 'contoh-1', name: 'PT Contoh Manufaktur', area: 'Semarang', service: 'Security',
      people: 12, contractEnd: day(75), owner: 'PIC RMP Contoh A', pic: 'HRGA',
      need: 'Evaluasi perpanjangan kontrak dan kebutuhan personel shift malam.',
      offerType: 'Perpanjangan kontrak', stage: 'review', next: day(-2),
      history: [{ date: day(-7), stage: 'review', note: 'Jadwalkan evaluasi layanan sebelum menyiapkan penawaran ulang.' }] },
    { id: 'contoh-2', name: 'Hotel Contoh Sentosa', area: 'Yogyakarta', service: 'Cleaning Service',
      people: 8, contractEnd: day(145), owner: 'PIC RMP Contoh B', pic: 'Facility Manager',
      need: 'Peluang layanan tambahan untuk area parkir dan keamanan acara.',
      offerType: 'Layanan tambahan', stage: 'sent', next: day(3),
      history: [{ date: day(-4), stage: 'sent', note: 'Contoh penawaran layanan tambahan telah disampaikan.' }] },
    { id: 'contoh-3', name: 'PT Contoh Logistik', area: 'Solo', service: 'Driver',
      people: 5, contractEnd: day(35), owner: 'PIC RMP Contoh A', pic: 'Procurement',
      need: 'Pembahasan perpanjangan dan penyesuaian jumlah pengemudi.',
      offerType: 'Perpanjangan + perluasan', stage: 'follow_up', next: day(0),
      history: [{ date: day(-3), stage: 'follow_up', note: 'Menunggu jadwal pembahasan penyesuaian kebutuhan.' }] }
  ];
  let picVisits = [];
  let picVisitsError = '';
  let realClients = [];
  let picClientId = '';
  const visitClient = (id) => realClients.find((row) => row.id === id);
  let salesVisits = [];
  let salesVisitError = '';
  let salesVisitsLoaded = false;
  let selectedId = clients[0].id;
  let activePicVisitStep = '1';
  const today = day(0);
  const isOpen = (row) => !['won', 'lost'].includes(row.stage);
  const isDue = (row) => isOpen(row) && row.next && row.next <= today;
  const isExpiring = (row) => row.contractEnd >= today && row.contractEnd <= day(90);
  const setStatus = (selector, message, error = false) => {
    const node = $(selector);
    node.textContent = message;
    node.classList.toggle('error', error);
  };
  $('#client-pic-filter').innerHTML = '<option value="all">Semua PIC</option>' +
    [...new Set(clients.map((row) => row.owner))].map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join('');

  function render() {
    const due = clients.filter(isDue).length;
    $('#client-summary').innerHTML = `
      <div><strong>${clients.length}</strong><small>Klien contoh</small></div>
      <div><strong>${[...new Set(clients.map((row) => row.owner))].length}</strong><small>PIC RMP contoh</small></div>
      <div><strong>${clients.filter(isExpiring).length}</strong><small>Kontrak ≤ 90 hari</small></div>
      <div><strong>${due}</strong><small>Follow up jatuh tempo</small></div>`;
    const query = $('#client-search').value.trim().toLocaleLowerCase('id');
    const filter = $('#client-filter').value;
    const picFilter = $('#client-pic-filter').value;
    const visible = clients.filter((row) => {
      const matchesQuery = !query || [row.name, row.service, row.area].some((value) => value.toLocaleLowerCase('id').includes(query));
      return matchesQuery && (picFilter === 'all' || row.owner === picFilter) && (filter === 'all' || (filter === 'due' ? isDue(row) : row.stage === filter));
    });
    if (!$('#clients').hidden && visible.length && !visible.some((row) => row.id === selectedId)) selectedId = visible[0].id;
    const detailId = visible.some((row) => row.id === selectedId) ? selectedId : visible[0]?.id;
    $('#client-list').innerHTML = visible.length ? visible.map((row) => `
      <button type="button" class="client-item ${row.id === detailId ? 'selected' : ''}" data-client-id="${row.id}" aria-pressed="${row.id === detailId}">
        <span class="client-item-top"><strong>${escapeHtml(row.name)}</strong><span class="client-pill ${isDue(row) ? 'overdue' : ''}">${isDue(row) ? 'Perlu follow up' : escapeHtml(stages[row.stage])}</span></span>
        <span>${escapeHtml(row.service)} · ${escapeHtml(row.area)} · ${row.people} personel</span>
        <small>PIC RMP: ${escapeHtml(row.owner)} · Kontrak: ${displayDate(row.contractEnd)} · Follow up: ${displayDate(row.next)}</small>
      </button>`).join('') : '<p class="hint">Tidak ada klien contoh yang cocok dengan filter.</p>';
    const row = visible.find((item) => item.id === detailId);
    if (!row) { $('#client-detail').textContent = 'Tidak ada klien contoh yang cocok dengan filter.'; return; }
    $('#client-detail').innerHTML = `
      <h3>${escapeHtml(row.name)}</h3>
      <div class="client-facts">
        <div><small>Layanan berjalan</small><strong>${escapeHtml(row.service)} · ${row.people} personel</strong></div>
        <div><small>Masa kontrak</small><strong>${displayDate(row.contractEnd)}</strong></div>
        <div><small>PIC klien</small><strong>${escapeHtml(row.pic)}</strong></div>
        <div><small>PIC RMP penanggung jawab</small><strong>${escapeHtml(row.owner)}</strong></div>
      </div>
      <p class="client-need"><strong>Kebutuhan / peluang</strong><br>${escapeHtml(row.need)}</p>
      <p><strong>Penawaran ulang:</strong> ${escapeHtml(row.offerType)} · ${escapeHtml(stages[row.stage])}<br><small>Follow up: ${displayDate(row.next)}</small></p>
      <div class="actions"><button type="button" data-client-action="visit" data-client-id="${row.id}">Buka PIC Visit</button><button type="button" data-client-action="progress" data-client-id="${row.id}">Buka Monitoring & Tindaklanjut</button></div>`;
  }
  function activityDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Tanggal belum tersedia' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function renderActivityItem(row) {
    const details = [
      row.owner && `PIC RMP: ${row.owner}`,
      row.contact && `PIC klien: ${row.contact}`,
      row.response && `Respons: ${row.response}`,
      row.next && `Follow up: ${displayDate(row.next)}`
    ].filter(Boolean);
    return `<div class="item"><strong>${escapeHtml(row.name || 'Perusahaan belum diisi')}</strong>
      <small>${escapeHtml(activityDate(row.at))}</small>
      <div><span class="badge ${row.visitStage === 'initial' ? 'processing' : ''}">${row.visitStage === 'initial' ? 'Tahap 1 · perlu detail' : 'Detail terisi'}</span></div>
      ${details.length ? `<small>${details.map(escapeHtml).join(' · ')}</small>` : ''}
      <p>${escapeHtml(row.note || 'Catatan hasil kunjungan belum diisi.')}</p></div>`;
  }
  function renderActivityDashboard() {
    const picSummary = `
      <div><strong>${picVisits.length}</strong><small>PIC Visit tercatat</small></div>
      <div><strong>${picVisits.filter((row) => row.visitStage === 'initial').length}</strong><small>PIC Visit perlu detail</small></div>`;
    const salesSummary = `
      <div><strong>${salesVisits.length}</strong><small>Sales Visit terbaca</small></div>
      <div><strong>${salesVisits.filter((row) => row.visitStage === 'initial').length}</strong><small>Sales Visit perlu detail</small></div>`;
    const picList = picVisits.length ? picVisits.map((row) => {
      const client = visitClient(row.clientId);
      return renderActivityItem({ ...row, name: client?.name, owner: client?.owner });
    }).join('') : `<p class="hint">${picVisitsError || 'Belum ada PIC Visit yang tercatat.'}</p>`;
    const salesStatus = salesVisitError || (salesVisitsLoaded
      ? `Menampilkan ${salesVisits.length} laporan terbaru yang dapat diakses akun ini (maksimal 100).`
      : 'Memuat Sales Visit…');
    const salesList = salesVisits.length ? salesVisits.map(renderActivityItem).join('')
      : `<p class="hint">${salesVisitError ? 'Data Sales Visit belum dapat ditampilkan.' : salesVisitsLoaded ? 'Belum ada Sales Visit yang dapat ditampilkan.' : 'Menunggu data Sales Visit.'}</p>`;
    for (const prefix of ['activity-', 'new-activity-']) {
      $(`#${prefix}dashboard-summary`).innerHTML = prefix === 'new-activity-' ? salesSummary + picSummary : picSummary + salesSummary;
      $(`#${prefix}pic-list`).innerHTML = picList;
      $(`#${prefix}sales-status`).textContent = salesStatus;
      $(`#${prefix}sales-list`).innerHTML = salesList;
    }
  }
  function syncProgressStage() {
    const closed = !isOpen({ stage: $('#client-progress-stage').value });
    $('#client-progress-next-wrap').hidden = closed;
    $('#client-progress-next').required = !closed;
    if (closed) $('#client-progress-next').value = '';
  }
  function renderProgress() {
    const open = clients.filter(isOpen);
    const due = clients.filter(isDue).sort((a, b) => a.next.localeCompare(b.next));
    $('#client-progress-summary').innerHTML = `
      <div><strong>${due.filter((row) => row.next < today).length}</strong><small>Terlambat</small></div>
      <div><strong>${due.filter((row) => row.next === today).length}</strong><small>Hari ini</small></div>
      <div><strong>${open.filter((row) => row.next > today).length}</strong><small>Akan datang</small></div>
      <div><strong>${open.filter((row) => !row.next).length}</strong><small>Belum dijadwalkan</small></div>`;
    $('#client-progress-due').innerHTML = due.length ? `<h3>Perlu ditindaklanjuti</h3>${due.map((row) => `
      <div class="due-item"><div><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.owner)} · ${displayDate(row.next)} · ${escapeHtml(stages[row.stage])}</small></div><button type="button" data-client-progress-open="${row.id}">Catat progress</button></div>`).join('')}` : '<p class="hint">Tidak ada penawaran ulang yang jatuh tempo hari ini atau terlambat.</p>';
    const row = clients.find((item) => item.id === selectedId);
    $('#client-progress-client').innerHTML = '<option value="">Pilih klien</option>' + clients.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${escapeHtml(item.owner)}</option>`).join('');
    $('#client-progress-client').value = row?.id || '';
    $('#client-progress-owner').textContent = row ? `PIC RMP: ${row.owner} · Tahap saat ini: ${stages[row.stage]}` : '';
    if (!row) { $('#client-progress-history').textContent = 'Pilih klien untuk melihat riwayat.'; return; }
    $('#client-progress-type').value = row.offerType;
    $('#client-progress-stage').value = row.stage;
    $('#client-progress-next').value = row.next;
    syncProgressStage();
    $('#client-progress-history').innerHTML = row.history.slice().reverse().map((event) => `
      <div class="item timeline-item"><strong>${escapeHtml(stages[event.stage])}</strong><small>${displayDate(event.date)}</small><p>${escapeHtml(event.note)}</p></div>`).join('');
  }
  function addPicVisitService(name = '', count = '') {
    const row = document.createElement('div');
    row.className = 'visit-service';
    row.innerHTML = `<label>Bagian kerja<input data-pic-service-name maxlength="100" value="${escapeHtml(name)}" placeholder="Security / Cleaning Service"></label><label>Jumlah<input data-pic-service-count type="number" min="0" max="100000" value="${escapeHtml(count)}" inputmode="numeric"></label><button type="button" data-remove-pic-service>Hapus</button>`;
    $('#pic-visit-services').appendChild(row);
  }
  function openPicVisitStep(step) {
    activePicVisitStep = step;
    for (const number of ['1', '2']) {
      const active = number === step;
      $(`#pic-visit-step-${number}`).hidden = !active;
      $(`#pic-visit-step-button-${number}`).classList.toggle('active', active);
      $(`#pic-visit-step-button-${number}`).setAttribute('aria-expanded', String(active));
    }
    $('#save-pic-visit').textContent = step === '1' ? 'Simpan tahap 1' : 'Simpan detail';
  }
  function renderPicVisits() {
    const clientValue = $('#pic-visit-client').value || picClientId;
    const savedValue = $('#pic-visit-saved').value;
    $('#pic-visit-client').innerHTML = '<option value="">Pilih klien aktif</option>' + realClients.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`).join('');
    $('#pic-visit-client').value = realClients.some((row) => row.id === clientValue) ? clientValue : '';
    const owner = visitClient($('#pic-visit-client').value)?.owner;
    $('#pic-visit-owner').textContent = owner ? `PIC RMP: ${owner}` : '';
    const label = (row) => visitClient(row.clientId)?.name || 'Client tidak ditemukan';
    $('#pic-visit-saved').innerHTML = '<option value="">Pilih kunjungan</option>' + picVisits.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(label(row))} · ${escapeHtml(new Date(row.at).toLocaleString('id-ID'))}</option>`).join('');
    if (picVisits.some((row) => row.id === savedValue)) $('#pic-visit-saved').value = savedValue;
    $('#pic-visit-list').innerHTML = picVisits.length ? picVisits.map((row) => `
      <div class="item"><strong>${escapeHtml(label(row))}</strong><small>${escapeHtml(new Date(row.at).toLocaleString('id-ID'))} · ${escapeHtml(row.contact)} · ${escapeHtml(visitClient(row.clientId)?.owner || '')}</small><p>${escapeHtml(row.note || 'Detail belum dilengkapi.')}</p><span class="badge ${row.visitStage === 'initial' ? 'processing' : ''}">${row.visitStage === 'initial' ? 'Tahap 1 · perlu detail' : 'Detail terisi'}</span>${row.mine === false ? '' : `<div><button type="button" data-open-pic-visit="${escapeHtml(row.id)}">${row.visitStage === 'initial' ? 'Lengkapi detail' : 'Buka / ubah'}</button></div>`}</div>`).join('') : `<p class="hint">${picVisitsError || 'Belum ada PIC Visit. Catat tahap 1 setelah bertemu PIC client.'}</p>`;
  }
  function renderAll() {
    render();
    renderProgress();
    renderPicVisits();
    renderActivityDashboard();
  }
  window.addEventListener('marketing:clients-snapshot', (event) => {
    realClients = Array.isArray(event.detail?.clients) ? event.detail.clients : [];
    renderPicVisits(); renderActivityDashboard();
  });
  window.addEventListener('marketing:picvisits-snapshot', (event) => {
    picVisits = Array.isArray(event.detail?.visits) ? event.detail.visits : [];
    picVisitsError = event.detail?.error || '';
    renderPicVisits(); renderActivityDashboard();
  });
  window.marketingPicVisit = { open(clientId) { picClientId = clientId; resetPicVisit(); document.querySelector('[data-tab="pic-visits"]').click(); } };
  window.addEventListener('marketing:visits-snapshot', (event) => {
    salesVisits = Array.isArray(event.detail?.visits) ? event.detail.visits : [];
    salesVisitError = event.detail?.error || '';
    salesVisitsLoaded = true;
    renderActivityDashboard();
  });
  function fillPicVisit(row) {
    picClientId = row.clientId;
    renderAll();
    $('#pic-visit-saved').value = row.id;
    $('#pic-visit-client').value = row.clientId;
    $('#pic-visit-category').value = row.category;
    $('#pic-visit-contact').value = row.contact;
    $('#pic-visit-role').value = row.role;
    $('#pic-visit-coordinates').value = row.coordinates || '';
    $('#pic-visit-address').value = row.address || '';
    $('#pic-visit-phone').value = row.phone || '';
    $('#pic-visit-company-phone').value = row.companyPhone || '';
    $('#pic-visit-response').value = row.response || '';
    $('#pic-visit-workforce').value = row.workforce || '';
    $('#pic-visit-need').value = row.need || '';
    $('#pic-visit-note').value = row.note || '';
    $('#pic-visit-important').value = row.important || '';
    $('#pic-visit-stage').value = row.offerStage || '';
    $('#pic-visit-next').value = row.next || '';
    $('#pic-visit-services').replaceChildren();
    (row.services?.length ? row.services : [{ name: '', count: '' }]).forEach((service) => addPicVisitService(service.name, service.count));
    $('#pic-visit-title').textContent = 'Lengkapi PIC Visit';
    $('#new-pic-visit').hidden = false;
    $('#pic-visit-timestamp').textContent = `Tercatat: ${new Date(row.at).toLocaleString('id-ID')}`;
    openPicVisitStep('2');
    document.querySelector('[data-tab="pic-visits"]').click();
  }
  function resetPicVisit() {
    $('#pic-visit-form').reset();
    $('#pic-visit-client').value = picClientId;
    $('#pic-visit-saved').value = '';
    $('#pic-visit-services').replaceChildren();
    addPicVisitService();
    $('#pic-visit-title').textContent = 'Catat PIC Visit';
    $('#new-pic-visit').hidden = true;
    $('#pic-visit-timestamp').textContent = 'Waktu dicatat saat tombol Simpan ditekan.';
    $('#pic-visit-photo-note').textContent = '';
    $('#pic-visit-location-status').textContent = '';
    setStatus('#pic-visit-status', '');
    openPicVisitStep('1');
    renderPicVisits();
  }
  $('#client-search').addEventListener('input', renderAll);
  $('#client-filter').addEventListener('change', renderAll);
  $('#client-pic-filter').addEventListener('change', renderAll);
  $('#client-list').addEventListener('click', (event) => {
    const id = event.target.closest('[data-client-id]')?.dataset.clientId;
    if (clients.some((row) => row.id === id)) {
      selectedId = id;
      $('#pic-visit-client').value = id;
      renderAll();
    }
  });
  $('#client-detail').addEventListener('click', (event) => {
    const button = event.target.closest('[data-client-action]');
    const action = button?.dataset.clientAction;
    if (button) {
      selectedId = button.dataset.clientId;
      $('#pic-visit-client').value = selectedId;
      renderAll();
    }
    if (action === 'visit') document.querySelector('[data-tab="pic-visits"]').click();
    if (action === 'progress') document.querySelector('[data-tab="client-progress"]').click();
  });
  $('#client-progress-client').addEventListener('change', () => {
    selectedId = $('#client-progress-client').value;
    $('#client-progress-note').value = '';
    renderAll();
  });
  $('#client-progress-stage').addEventListener('change', syncProgressStage);
  $('#client-progress-due').addEventListener('click', (event) => {
    const id = event.target.closest('[data-client-progress-open]')?.dataset.clientProgressOpen;
    if (!clients.some((row) => row.id === id)) return;
    selectedId = id;
    renderAll();
    $('#client-progress-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#client-progress-date').value = today;
  $('#client-progress-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const row = clients.find((client) => client.id === $('#client-progress-client').value);
    if (!row) { setStatus('#client-progress-status', 'Pilih klien aktif terlebih dahulu.', true); return; }
    const stage = $('#client-progress-stage').value;
    const next = $('#client-progress-next').value;
    const note = $('#client-progress-note').value.trim();
    if (!note || !$('#client-progress-date').value) { setStatus('#client-progress-status', 'Isi tanggal dan respons klien.', true); return; }
    if (isOpen({ stage }) && (!next || next < today)) { setStatus('#client-progress-status', 'Tahap terbuka memerlukan follow up hari ini atau setelahnya.', true); return; }
    row.offerType = $('#client-progress-type').value;
    row.stage = stage;
    row.next = isOpen(row) ? next : '';
    row.history.push({ date: $('#client-progress-date').value, stage, note });
    selectedId = row.id;
    renderAll();
    $('#client-progress-note').value = '';
    setStatus('#client-progress-status', 'Simulasi diperbarui di browser. Muat ulang halaman untuk mengembalikan data contoh.');
  });
  $('#pic-visit-client').addEventListener('change', () => {
    picClientId = $('#pic-visit-client').value;
    const client = visitClient(picClientId);
    $('#pic-visit-owner').textContent = client ? `PIC RMP: ${client.owner}` : '';
  });
  $('#get-pic-visit-location').addEventListener('click', () => {
    if (!navigator.geolocation) {
      $('#pic-visit-location-status').textContent = 'Perangkat ini tidak menyediakan lokasi. Isi koordinat manual.';
      return;
    }
    $('#pic-visit-location-status').textContent = 'Meminta lokasi perangkat…';
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      $('#pic-visit-coordinates').value = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      $('#pic-visit-location-status').textContent = 'Koordinat terisi. Tekan Simpan untuk menyimpannya.';
    }, () => {
      $('#pic-visit-location-status').textContent = 'Lokasi tidak tersedia. Isi koordinat manual jika perlu.';
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
  document.querySelectorAll('[data-pic-visit-step]').forEach((button) => button.addEventListener('click', () => openPicVisitStep(button.dataset.picVisitStep)));
  $('#new-pic-visit').addEventListener('click', resetPicVisit);
  $('#pic-visit-saved').addEventListener('change', () => {
    const row = picVisits.find((item) => item.id === $('#pic-visit-saved').value);
    if (row) fillPicVisit(row);
  });
  $('#pic-visit-list').addEventListener('click', (event) => {
    const row = picVisits.find((item) => item.id === event.target.closest('[data-open-pic-visit]')?.dataset.openPicVisit);
    if (row) fillPicVisit(row);
  });
  $('#add-pic-visit-service').addEventListener('click', () => addPicVisitService());
  $('#pic-visit-services').addEventListener('click', (event) => {
    if (!event.target.closest('[data-remove-pic-service]')) return;
    event.target.closest('.visit-service').remove();
    if (!$('#pic-visit-services').children.length) addPicVisitService();
  });
  let picVisitSaving = false;
  $('#pic-visit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (picVisitSaving) return;
    if (!window.marketingApi?.savePicVisit) { setStatus('#pic-visit-status', 'Aplikasi belum siap. Muat ulang halaman.', true); return; }
    const base = (existing) => ({ category: $('#pic-visit-category').value, contact: $('#pic-visit-contact').value.trim(), role: $('#pic-visit-role').value.trim(), coordinates: $('#pic-visit-coordinates').value.trim(), ...(existing || {}) });
    let payload;
    if (activePicVisitStep === '1') {
      const fields = ['#pic-visit-client', '#pic-visit-category', '#pic-visit-contact', '#pic-visit-role'].map($);
      const invalid = fields.find((field) => !field.reportValidity());
      if (invalid) { invalid.focus(); return; }
      const existing = picVisits.find((item) => item.id === $('#pic-visit-saved').value);
      payload = { id: existing?.id, clientId: $('#pic-visit-client').value, visitStage: existing?.visitStage || 'initial', data: { ...(existing?.data || {}), ...base() } };
    } else {
      const existing = picVisits.find((item) => item.id === $('#pic-visit-saved').value);
      if (!existing) { setStatus('#pic-visit-status', 'Pilih PIC Visit yang sudah dicatat.', true); return; }
      const response = $('#pic-visit-response').value;
      const note = $('#pic-visit-note').value.trim();
      if (!response || !note) { setStatus('#pic-visit-status', 'Isi respons dan catatan hasil kunjungan.', true); return; }
      if ($('#pic-visit-workforce').value && !$('#pic-visit-workforce').reportValidity()) return;
      const offerStage = $('#pic-visit-stage').value;
      const next = $('#pic-visit-next').value;
      if (offerStage && isOpen({ stage: offerStage }) && (!next || next < today)) {
        setStatus('#pic-visit-status', 'Status penawaran terbuka memerlukan jadwal follow up hari ini atau setelahnya.', true); return;
      }
      const services = [...document.querySelectorAll('#pic-visit-services .visit-service')].map((item) => ({
        name: item.querySelector('[data-pic-service-name]').value.trim(), count: item.querySelector('[data-pic-service-count]').value.trim()
      })).filter((item) => item.name || item.count);
      if (services.some((item) => !item.name || !item.count)) { setStatus('#pic-visit-status', 'Lengkapi nama bagian kerja dan jumlahnya.', true); return; }
      payload = { id: existing.id, clientId: existing.clientId, visitStage: 'detail', data: { ...existing.data, ...base(), address: $('#pic-visit-address').value.trim(), phone: $('#pic-visit-phone').value.trim(),
        companyPhone: $('#pic-visit-company-phone').value.trim(), response, workforce: $('#pic-visit-workforce').value,
        need: $('#pic-visit-need').value.trim(), services, note, important: $('#pic-visit-important').value.trim(),
        offerStage, next: offerStage && isOpen({ stage: offerStage }) ? next : '' } };
    }
    picVisitSaving = true;
    setStatus('#pic-visit-status', 'Menyimpan…');
    const result = await window.marketingApi.savePicVisit(payload);
    picVisitSaving = false;
    if (result.error) { setStatus('#pic-visit-status', 'Gagal menyimpan: ' + result.error, true); return; }
    picClientId = payload.clientId;
    renderAll();
    $('#pic-visit-saved').value = result.id;
    $('#pic-visit-timestamp').textContent = `Tercatat: ${new Date(result.at).toLocaleString('id-ID')}`;
    $('#new-pic-visit').hidden = false;
    if (activePicVisitStep === '1') {
      $('#pic-visit-photo').value = '';
      openPicVisitStep('2');
      setStatus('#pic-visit-status', 'Tahap 1 tersimpan. Lengkapi detail pada record yang sama.');
    } else setStatus('#pic-visit-status', 'Detail PIC Visit tersimpan.');
  });
  addPicVisitService();
  renderAll();
})();
