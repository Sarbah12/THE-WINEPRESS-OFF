(function () {
  const collectionLabels = {
    subscriptions: 'Subscribers',
    prayerRequests: 'Prayer Requests',
    messages: 'Messages',
    collaborations: 'Collaborations',
    testimonies: 'Testimonies',
    prayerWall: 'Prayer Wall'
  };

  let activeCollection = 'prayerRequests';
  let loadedItems = [];
  let filteredItems = [];
  const selectedEntryIds = new Set();

  async function loadBackendStatus() {
    const target = document.getElementById('backendStatus');
    if (!target) {
      return;
    }

    target.textContent = 'Checking backend connection...';

    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Backend health check failed.');
      }

      const isVercel = window.location.hostname.includes('vercel.app');
      if (data.storage === 'blob') {
        target.textContent = 'Backend connected. Live submissions are saving to Vercel Blob.';
        return;
      }

      if (isVercel) {
        target.textContent = 'Backend is running, but storage is using temporary file mode. Add BLOB_READ_WRITE_TOKEN in Vercel so frontend submissions appear reliably in admin.';
        return;
      }

      target.textContent = 'Backend connected. Local file storage is active for development.';
    } catch (error) {
      target.textContent = error.message || 'Unable to verify backend connection right now.';
    }
  }

  async function loadOverview() {
    const response = await fetch('/api/admin/overview');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Unable to load overview.');
    }

    document.querySelectorAll('[data-summary]').forEach(card => {
      const key = card.dataset.summary;
      card.querySelector('.metric-value').textContent = data.collections[key] || 0;
    });
  }

  function formatDate(value) {
    if (!value) return 'Unknown time';
    return new Date(value).toLocaleString();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function entryBody(collection, item) {
    if (collection === 'subscriptions') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Source:</strong> ${escapeHtml(item.source)}</p>
      `;
    }

    if (collection === 'prayerRequests') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name || 'Anonymous')}</p>
        <p><strong>Email:</strong> ${escapeHtml(item.email || 'Not provided')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(item.phone || 'Not provided')}</p>
        <p><strong>Season:</strong> ${escapeHtml(item.season || 'Not provided')}</p>
        <p><strong>Urgency:</strong> ${escapeHtml(item.urgency || 'normal')}</p>
        <p><strong>Follow-up Requested:</strong> ${item.followUp ? 'Yes' : 'No'}</p>
        <p><strong>Topics:</strong> ${escapeHtml((item.topics || []).join(', ') || 'Not specified')}</p>
        <p><strong>Prayer Wall:</strong> ${item.addToWall ? 'Yes' : 'No'}</p>
        <p><strong>Request:</strong> ${escapeHtml(item.request)}</p>
      `;
    }

    if (collection === 'messages') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Location:</strong> ${escapeHtml(item.city || 'Not provided')}</p>
        <p><strong>Subject:</strong> ${escapeHtml(item.subject || 'Not specified')}</p>
        <p><strong>Message:</strong> ${escapeHtml(item.message)}</p>
      `;
    }

    if (collection === 'collaborations') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Organisation:</strong> ${escapeHtml(item.organisation || 'Not provided')}</p>
        <p><strong>Platform:</strong> ${escapeHtml(item.platform || 'Not provided')}</p>
        <p><strong>Type:</strong> ${escapeHtml(item.type || 'Not specified')}</p>
        <p><strong>Idea:</strong> ${escapeHtml(item.idea)}</p>
      `;
    }

    if (collection === 'testimonies') {
      return `
        <p><strong>Name:</strong> ${item.anonymous ? 'Anonymous' : escapeHtml(`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Not provided')}</p>
        <p><strong>Origin:</strong> ${escapeHtml(item.origin || 'Not provided')}</p>
        <p><strong>Theme:</strong> ${escapeHtml(item.theme || 'Not specified')}</p>
        <p><strong>Headline:</strong> ${escapeHtml(item.headline)}</p>
        <p><strong>Verse:</strong> ${escapeHtml(item.verse || 'Not provided')}</p>
        <p><strong>Story:</strong> ${escapeHtml(item.story)}</p>
      `;
    }

    return `
      <p><strong>Category:</strong> ${escapeHtml(item.category || 'Prayer')}</p>
      <p><strong>Text:</strong> ${escapeHtml(item.text)}</p>
      <p><strong>Prayed:</strong> ${item.prayerCount || 0}</p>
    `;
  }

  function testimonyActions(item) {
    return `
      <div class="entry-inline-actions">
        <select class="status-select" data-status-id="${item.id}">
          <option value="pending-review" ${item.status === 'pending-review' ? 'selected' : ''}>Pending Review</option>
          <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="archived" ${item.status === 'archived' ? 'selected' : ''}>Archived</option>
        </select>
        <button class="entry-btn muted" data-update-id="${item.id}">Update Status</button>
      </div>
    `;
  }

  function searchableText(item) {
    return Object.values(item || {})
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(value => String(value || '').toLowerCase())
      .join(' ');
  }

  function normalizeItems(items) {
    const sortSelect = document.getElementById('sortEntries');
    const searchInput = document.getElementById('entrySearch');
    const dateFilter = document.getElementById('dateFilter');
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const sortMode = sortSelect ? sortSelect.value : 'newest';
    const dateMode = dateFilter ? dateFilter.value : 'all';
    const now = Date.now();

    let nextItems = items.slice();

    if (query) {
      nextItems = nextItems.filter(item => searchableText(item).includes(query));
    }

    if (dateMode !== 'all') {
      const thresholds = {
        today: 1000 * 60 * 60 * 24,
        week: 1000 * 60 * 60 * 24 * 7,
        month: 1000 * 60 * 60 * 24 * 30
      };
      const limit = thresholds[dateMode];
      if (limit) {
        nextItems = nextItems.filter(item => {
          const createdAt = new Date(item.createdAt || 0).getTime();
          return createdAt && (now - createdAt) <= limit;
        });
      }
    }

    nextItems.sort((left, right) => {
      const leftTime = new Date(left.createdAt || 0).getTime();
      const rightTime = new Date(right.createdAt || 0).getTime();
      return sortMode === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
    });

    return nextItems;
  }

  function csvValue(value) {
    return `"${String(value == null ? '' : value).replaceAll('"', '""')}"`;
  }

  function collectionExportRows(items) {
    return items.map(item => {
      const row = {};
      Object.entries(item || {}).forEach(([key, value]) => {
        row[key] = Array.isArray(value) ? value.join(', ') : value;
      });
      return row;
    });
  }

  function downloadFile(filename, contents, type) {
    const blob = new Blob([contents], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function exportJson() {
    const name = activeCollection || 'collection';
    downloadFile(`${name}.json`, JSON.stringify(filteredItems, null, 2), 'application/json');
  }

  function exportCsv() {
    const rows = collectionExportRows(filteredItems);
    if (!rows.length) {
      alert('There are no entries to export in this view yet.');
      return;
    }

    const headers = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach(key => set.add(key));
      return set;
    }, new Set()));

    const lines = [
      headers.map(csvValue).join(','),
      ...rows.map(row => headers.map(header => csvValue(row[header])).join(','))
    ];

    downloadFile(`${activeCollection}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  }

  async function copyEntry(item) {
    const lines = Object.entries(item || {}).map(([key, value]) => {
      const printable = Array.isArray(value) ? value.join(', ') : value;
      return `${key}: ${printable == null ? '' : printable}`;
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      alert('Entry copied.');
    } catch {
      alert('Could not copy this entry right now.');
    }
  }

  async function copyFilteredView() {
    if (!filteredItems.length) {
      alert('There are no visible entries to copy right now.');
      return;
    }

    const payload = filteredItems.map(item => {
      const lines = Object.entries(item || {}).map(([key, value]) => {
        const printable = Array.isArray(value) ? value.join(', ') : value;
        return `${key}: ${printable == null ? '' : printable}`;
      });
      return lines.join('\n');
    }).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(payload);
      alert('Current view copied.');
    } catch {
      alert('Could not copy the current view right now.');
    }
  }

  function updateSummary(items) {
    const visibleCount = document.getElementById('visibleCount');
    const selectedCount = document.getElementById('selectedCount');
    const latestEntry = document.getElementById('latestEntry');

    if (visibleCount) {
      visibleCount.textContent = `${items.length} entr${items.length === 1 ? 'y' : 'ies'}`;
    }

    if (selectedCount) {
      selectedCount.textContent = `${selectedEntryIds.size} selected`;
    }

    if (latestEntry) {
      const item = items[0];
      latestEntry.textContent = item
        ? `${formatDate(item.createdAt)}${item.name ? ` • ${item.name}` : ''}`
        : 'No entries yet';
    }
  }

  function syncSelectionState() {
    document.querySelectorAll('[data-select-id]').forEach(input => {
      const checked = selectedEntryIds.has(input.dataset.selectId);
      input.checked = checked;
      const card = input.closest('.entry-card');
      if (card) {
        card.classList.toggle('is-selected', checked);
      }
    });
    updateSummary(filteredItems);
  }

  async function deleteSelectedEntries() {
    const ids = Array.from(selectedEntryIds);
    if (!ids.length) {
      alert('Select one or more entries first.');
      return;
    }

    if (!window.confirm(`Delete ${ids.length} selected entr${ids.length === 1 ? 'y' : 'ies'}?`)) {
      return;
    }

    for (const entryId of ids) {
      const response = await fetch(`/api/admin/${activeCollection}/${entryId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || `Delete failed for ${entryId}.`);
        return;
      }
    }

    selectedEntryIds.clear();
    await loadOverview();
    await loadCollection(activeCollection);
  }

  function toggleSelectAllVisible() {
    const allVisibleSelected = filteredItems.length > 0 && filteredItems.every(item => selectedEntryIds.has(item.id));
    filteredItems.forEach(item => {
      if (allVisibleSelected) {
        selectedEntryIds.delete(item.id);
      } else {
        selectedEntryIds.add(item.id);
      }
    });
    syncSelectionState();
  }

  function renderCollection(items) {
    filteredItems = normalizeItems(items);

    const list = document.getElementById('entryList');
    const empty = document.getElementById('emptyState');
    const status = document.getElementById('panelStatus');

    list.innerHTML = '';
    empty.style.display = 'none';

    if (!items.length) {
      empty.style.display = 'block';
      status.textContent = 'No entries yet.';
      return;
    }

    if (!filteredItems.length) {
      empty.style.display = 'block';
      status.textContent = 'No entries match your search.';
      return;
    }

    list.innerHTML = filteredItems.map(item => `
      <article class="entry-card">
        <div class="entry-meta">
          <div class="entry-meta-primary">
            <input class="entry-select" type="checkbox" data-select-id="${item.id}" ${selectedEntryIds.has(item.id) ? 'checked' : ''}/>
            <span class="entry-id">${escapeHtml(item.id)}</span>
          </div>
          <span class="entry-date">${escapeHtml(formatDate(item.createdAt))}</span>
        </div>
        <div class="entry-body">${entryBody(activeCollection, item)}</div>
        <div class="entry-actions">
          ${activeCollection === 'testimonies' ? testimonyActions(item) : ''}
          <button class="entry-btn secondary" data-copy-id="${item.id}">Copy</button>
          <button class="entry-btn danger" data-delete-id="${item.id}">Delete</button>
        </div>
      </article>
      `).join('');

    status.textContent = `${filteredItems.length} of ${items.length} item${items.length === 1 ? '' : 's'} shown.`;
    bindEntryActions();
    syncSelectionState();
  }

  async function loadCollection(name) {
    activeCollection = name;
    selectedEntryIds.clear();
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.collection === name);
    });

    const title = document.getElementById('panelTitle');
    const status = document.getElementById('panelStatus');

    title.textContent = collectionLabels[name];
    status.textContent = 'Loading...';

    try {
      const response = await fetch(`/api/admin/${name}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load data.');
      }

      loadedItems = Array.isArray(data.items) ? data.items : [];
      renderCollection(loadedItems);
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function bindEntryActions() {
    document.querySelectorAll('[data-select-id]').forEach(input => {
      input.addEventListener('change', function () {
        if (input.checked) {
          selectedEntryIds.add(input.dataset.selectId);
        } else {
          selectedEntryIds.delete(input.dataset.selectId);
        }
        syncSelectionState();
      });
    });

    document.querySelectorAll('[data-copy-id]').forEach(button => {
      button.addEventListener('click', async function () {
        const entryId = button.dataset.copyId;
        const item = filteredItems.find(entry => entry.id === entryId);
        if (item) {
          await copyEntry(item);
        }
      });
    });

    document.querySelectorAll('[data-delete-id]').forEach(button => {
      button.addEventListener('click', async function () {
        const entryId = button.dataset.deleteId;
        if (!window.confirm('Delete this entry?')) {
          return;
        }

        const response = await fetch(`/api/admin/${activeCollection}/${entryId}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
          alert(data.error || 'Delete failed.');
          return;
        }

        await loadOverview();
        await loadCollection(activeCollection);
      });
    });

    document.querySelectorAll('[data-update-id]').forEach(button => {
      button.addEventListener('click', async function () {
        const entryId = button.dataset.updateId;
        const select = document.querySelector(`[data-status-id="${entryId}"]`);
        const status = select ? select.value : '';

        const response = await fetch(`/api/admin/testimonies/${entryId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });

        const data = await response.json();
        if (!response.ok) {
          alert(data.error || 'Update failed.');
          return;
        }

        await loadCollection(activeCollection);
      });
    });
  }

  function bindTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        loadCollection(tab.dataset.collection);
      });
    });
  }

  function bindWorkspaceTools() {
    const searchInput = document.getElementById('entrySearch');
    const sortSelect = document.getElementById('sortEntries');
    const dateFilter = document.getElementById('dateFilter');
    const exportJsonButton = document.getElementById('exportJson');
    const exportCsvButton = document.getElementById('exportCsv');
    const copyFilteredButton = document.getElementById('copyFiltered');
    const selectAllVisibleButton = document.getElementById('selectAllVisible');
    const deleteSelectedButton = document.getElementById('deleteSelected');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        renderCollection(loadedItems);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        selectedEntryIds.clear();
        renderCollection(loadedItems);
      });
    }

    if (dateFilter) {
      dateFilter.addEventListener('change', function () {
        selectedEntryIds.clear();
        renderCollection(loadedItems);
      });
    }

    if (exportJsonButton) {
      exportJsonButton.addEventListener('click', exportJson);
    }

    if (exportCsvButton) {
      exportCsvButton.addEventListener('click', exportCsv);
    }

    if (copyFilteredButton) {
      copyFilteredButton.addEventListener('click', copyFilteredView);
    }

    if (selectAllVisibleButton) {
      selectAllVisibleButton.addEventListener('click', toggleSelectAllVisible);
    }

    if (deleteSelectedButton) {
      deleteSelectedButton.addEventListener('click', deleteSelectedEntries);
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    bindTabs();
    bindWorkspaceTools();
    const refreshButton = document.getElementById('refreshAll');
    if (refreshButton) {
      refreshButton.addEventListener('click', async function () {
        await loadBackendStatus();
        await loadOverview();
        await loadCollection(activeCollection);
      });
    }

    await loadBackendStatus();
    await loadOverview();
    await loadCollection(activeCollection);
  });
})();
