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

  async function loadCollection(name) {
    activeCollection = name;
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.collection === name);
    });

    const title = document.getElementById('panelTitle');
    const list = document.getElementById('entryList');
    const empty = document.getElementById('emptyState');
    const status = document.getElementById('panelStatus');

    title.textContent = collectionLabels[name];
    status.textContent = 'Loading...';
    list.innerHTML = '';
    empty.style.display = 'none';

    try {
      const response = await fetch(`/api/admin/${name}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load data.');
      }

      if (!data.items.length) {
        empty.style.display = 'block';
        status.textContent = 'No entries yet.';
        return;
      }

      list.innerHTML = data.items.map(item => `
        <article class="entry-card">
          <div class="entry-meta">
            <span class="entry-id">${escapeHtml(item.id)}</span>
            <span class="entry-date">${escapeHtml(formatDate(item.createdAt))}</span>
          </div>
          <div class="entry-body">${entryBody(name, item)}</div>
          <div class="entry-actions">
            ${name === 'testimonies' ? testimonyActions(item) : ''}
            <button class="entry-btn danger" data-delete-id="${item.id}">Delete</button>
          </div>
        </article>
      `).join('');

      status.textContent = `${data.items.length} item${data.items.length === 1 ? '' : 's'} loaded.`;
      bindEntryActions();
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function bindEntryActions() {
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

  document.addEventListener('DOMContentLoaded', async function () {
    bindTabs();
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
