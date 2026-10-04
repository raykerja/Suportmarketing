// Pratinjau halaman saja. Tidak membaca atau menulis data production.
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
      people: 12, contractEnd: day(75), owner: 'Tim Marketing', pic: 'HRGA',
      need: 'Evaluasi perpanjangan kontrak dan kebutuhan personel shift malam.',
      offerType: 'Perpanjangan kontrak', stage: 'review', next: day(-2),
      history: [{ date: day(-7), stage: 'review', note: 'Jadwalkan evaluasi layanan sebelum menyiapkan penawaran ulang.' }] },
    { id: 'contoh-2', name: 'Hotel Contoh Sentosa', area: 'Yogyakarta', service: 'Cleaning Service',
      people: 8, contractEnd: day(145), owner: 'Tim Marketing', pic: 'Facility Manager',
      need: 'Peluang layanan tambahan untuk area parkir dan keamanan acara.',
      offerType: 'Layanan tambahan', stage: 'sent', next: day(3),
      history: [{ date: day(-4), stage: 'sent', note: 'Contoh penawaran layanan tambahan telah disampaikan.' }] },
    { id: 'contoh-3', name: 'PT Contoh Logistik', area: 'Solo', service: 'Driver',
      people: 5, contractEnd: day(35), owner: 'Tim Marketing', pic: 'Procurement',
      need: 'Pembahasan perpanjangan dan penyesuaian jumlah pengemudi.',
      offerType: 'Perpanjangan + perluasan', stage: 'follow_up', next: day(0),
      history: [{ date: day(-3), stage: 'follow_up', note: 'Menunggu jadwal pembahasan penyesuaian kebutuhan.' }] }
  ];
  let selectedId = clients[0].id;
  const today = day(0);
  const isOpen = (row) => !['won', 'lost'].includes(row.stage);
  const isDue = (row) => isOpen(row) && row.next && row.next <= today;
  const isExpiring = (row) => row.contractEnd >= today && row.contractEnd <= day(90);

  function render() {
    const due = clients.filter(isDue).length;
    $('#client-summary').innerHTML = `
      <div><strong>${clients.length}</strong><small>Klien contoh</small></div>
      <div><strong>${clients.filter(isExpiring).length}</strong><small>Kontrak ≤ 90 hari</small></div>
      <div><strong>${due}</strong><small>Follow up jatuh tempo</small></div>
      <div><strong>${clients.filter((row) => isOpen(row) && /tambahan|perluasan/i.test(row.offerType)).length}</strong><small>Peluang layanan tambahan</small></div>`;
    const query = $('#client-search').value.trim().toLocaleLowerCase('id');
    const filter = $('#client-filter').value;
    const visible = clients.filter((row) => {
      const matchesQuery = !query || [row.name, row.service, row.area].some((value) => value.toLocaleLowerCase('id').includes(query));
      return matchesQuery && (filter === 'all' || (filter === 'due' ? isDue(row) : row.stage === filter));
    });
    $('#client-list').innerHTML = visible.length ? visible.map((row) => `
      <button type="button" class="client-item ${row.id === selectedId ? 'selected' : ''}" data-client-id="${row.id}" aria-pressed="${row.id === selectedId}">
        <span class="client-item-top"><strong>${escapeHtml(row.name)}</strong><span class="client-pill ${isDue(row) ? 'overdue' : ''}">${isDue(row) ? 'Perlu follow up' : escapeHtml(stages[row.stage])}</span></span>
        <span>${escapeHtml(row.service)} · ${escapeHtml(row.area)} · ${row.people} personel</span>
        <small>Kontrak: ${displayDate(row.contractEnd)} · Follow up: ${displayDate(row.next)}</small>
      </button>`).join('') : '<p class="hint">Tidak ada klien contoh yang cocok dengan filter.</p>';
    const row = clients.find((item) => item.id === selectedId);
    if (!row) return;
    $('#client-detail').innerHTML = `
      <h3>${escapeHtml(row.name)}</h3>
      <div class="client-facts">
        <div><small>Layanan berjalan</small><strong>${escapeHtml(row.service)} · ${row.people} personel</strong></div>
        <div><small>Masa kontrak</small><strong>${displayDate(row.contractEnd)}</strong></div>
        <div><small>PIC klien</small><strong>${escapeHtml(row.pic)}</strong></div>
        <div><small>Pemilik tindak lanjut</small><strong>${escapeHtml(row.owner)}</strong></div>
      </div>
      <p class="client-need"><strong>Kebutuhan / peluang</strong><br>${escapeHtml(row.need)}</p>
      <form id="client-offer-form">
        <h3>Perbarui penawaran</h3>
        <label>Jenis penawaran<select name="offerType" required>
          ${['Perpanjangan kontrak', 'Layanan tambahan', 'Perpanjangan + perluasan'].map((option) => `<option ${row.offerType === option ? 'selected' : ''}>${option}</option>`).join('')}
        </select></label>
        <label>Tahap penawaran<select name="stage" required>
          ${Object.entries(stages).map(([key, label]) => `<option value="${key}" ${row.stage === key ? 'selected' : ''}>${label}</option>`).join('')}
        </select></label>
        <label>Jadwal follow up berikutnya<input name="next" type="date" value="${escapeHtml(row.next)}"></label>
        <label>Hasil pembahasan & langkah berikutnya<textarea name="note" rows="3" maxlength="1000" required placeholder="Catat respons klien, kendala, dan tindakan berikutnya"></textarea></label>
        <button class="primary" type="submit">Coba perbarui (simulasi)</button>
        <p id="client-status" role="status" class="hint">Simulasi ini tidak menyimpan data.</p>
      </form>
      <h3>Riwayat penawaran</h3>
      <div class="client-history">${row.history.slice().reverse().map((event) => `<div class="item timeline-item"><strong>${escapeHtml(stages[event.stage])}</strong><small>${displayDate(event.date)}</small><p>${escapeHtml(event.note)}</p></div>`).join('')}</div>`;
  }
  $('#client-search').addEventListener('input', render);
  $('#client-filter').addEventListener('change', render);
  $('#client-list').addEventListener('click', (event) => {
    const id = event.target.closest('[data-client-id]')?.dataset.clientId;
    if (clients.some((row) => row.id === id)) { selectedId = id; render(); }
  });
  $('#client-detail').addEventListener('submit', (event) => {
    if (event.target.id !== 'client-offer-form') return;
    event.preventDefault();
    const row = clients.find((item) => item.id === selectedId);
    const form = event.target;
    const stage = form.elements.stage.value;
    const next = form.elements.next.value;
    const note = form.elements.note.value.trim();
    if (!note || !stages[stage]) return;
    if (!['won', 'lost'].includes(stage) && (!next || next < today)) {
      $('#client-status').textContent = 'Untuk penawaran terbuka, pilih jadwal follow up hari ini atau setelahnya.';
      $('#client-status').classList.add('error');
      return;
    }
    row.offerType = form.elements.offerType.value;
    row.stage = stage;
    row.next = ['won', 'lost'].includes(stage) ? '' : next;
    row.history.push({ date: today, stage, note });
    render();
    $('#client-status').textContent = 'Simulasi diperbarui di browser. Muat ulang halaman untuk mengembalikan data contoh.';
  });
  render();
})();
