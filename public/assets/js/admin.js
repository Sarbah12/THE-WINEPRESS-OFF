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

  async function readJsonResponse(response, fallbackMessage) {
    const raw = await response.text();

    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {
        error: response.ok
          ? fallbackMessage
          : 'The backend returned an unexpected response. Please refresh and try again.'
      };
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatDate(value) {
    if (!value) {
      return 'Unknown time';
    }

    return new Date(value).toLocaleString();
  }

  function entryBody(collection, item) {
    if (collection === 'subscriptions') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Source:</strong> ${escapeHtml(item.source || 'website')}</p>
      `;
    }

    if (collection === 'prayerRequests') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name || 'Anonymous')}</p>
        <p><strong>Email:</strong> ${escapeHtml(item.email || 'Not provided')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(item.phone || 'Not provided')}</p>
        <p><strong>Urgency:</strong> ${escapeHtml(item.urgency || 'normal')}</p>
        <p><strong>Request:</strong> ${escapeHtml(item.request || '')}</p>
      `;
    }

    if (collection === 'messages') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(item.subject || 'General enquiry')}</p>
        <p><strong>Message:</strong> ${escapeHtml(item.message || '')}</p>
      `;
    }

    if (collection === 'collaborations') {
      return `
        <p><strong>Name:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>Organisation:</strong> ${escapeHtml(item.organisation || 'Not provided')}</p>
        <p><strong>Platform:</strong> ${escapeHtml(item.platform || 'Not provided')}</p>
        <p><strong>Idea:</strong> ${escapeHtml(item.idea || '')}</p>
      `;
    }

    if (collection === 'testimonies') {
      const displayName = item.anonymous
        ? 'Anonymous'
        : `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Not provided';

      return `
        <p><strong>Name:</strong> ${escapeHtml(displayName)}</p>
        <p><strong>Headline:</strong> ${escapeHtml(item.headline || '')}</p>
        <p><strong>Theme:</strong> ${escapeHtml(item.theme || 'Not specified')}</p>
        <p><strong>Status:</strong> ${escapeHtml(item.status || 'pending-review')}</p>
        <p><strong>Story:</strong> ${escapeHtml(item.story || '')}</p>
      `;
    }

    return `
      <p><strong>Category:</strong> ${escapeHtml(item.category || 'Prayer')}</p>
      <p><strong>Text:</strong> ${escapeHtml(item.text || '')}</p>
      <p><strong>Prayed:</strong> ${item.prayerCount || 0}</p>
    `;
  }

  function testimonyActions(item) {
    return `
      <select class="status-select" data-status-id="${item.id}">
        <option value="pending-review" ${item.status === 'pending-review' ? 'selected' : ''}>Pending Review</option>
        <option value="approved" ${item.status === 'approved' ? 'selected' : ''}>Approved</option>
        <option value="archived" ${item.status === 'archived' ? 'selected' : ''}>Archived</option>
      </select>
      <button class="entry-btn secondary" data-update-id="${item.id}">Update Status</button>
    `;
  }

  async function loadBackendStatus() {
    const target = document.getElementById('backendStatus');
    if (!target) {
      return;
    }

    target.textContent = 'Checking backend connection...';

    try {
      const response = await fetch('/api/health');
      const data = await readJsonResponse(response, 'Backend health check failed.');
      if (!response.ok) {
        throw new Error(data.error || 'Backend health check failed.');
      }

      if (data.storage === 'postgres' || data.storage === 'blob') {
        target.textContent = 'Backend connected.';
        return;
      }

      target.textContent = 'Backend is running.';
    } catch (error) {
      target.textContent = error.message || 'Unable to verify backend connection right now.';
    }
  }

  async function loadOverview() {
    const response = await fetch('/api/admin/overview');
    const data = await readJsonResponse(response, 'Unable to load overview.');
    if (!response.ok) {
      throw new Error(data.error || 'Unable to load overview.');
    }

    document.querySelectorAll('[data-summary]').forEach(function (card) {
      const key = card.dataset.summary;
      const value = data.collections && typeof data.collections[key] === 'number'
        ? data.collections[key]
        : 0;
      card.querySelector('.metric-value').textContent = value;
    });
  }

  async function loadCollection(name) {
    activeCollection = name;
    document.querySelectorAll('.admin-tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.collection === name);
    });

    const title = document.getElementById('panelTitle');
    const status = document.getElementById('panelStatus');
    const list = document.getElementById('entryList');
    const empty = document.getElementById('emptyState');

    title.textContent = collectionLabels[name];
    status.textContent = 'Loading...';
    list.innerHTML = '';
    empty.style.display = 'none';

    try {
      const response = await fetch(`/api/admin/${name}`);
      const data = await readJsonResponse(response, 'Unable to load data.');
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load data.');
      }

      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        empty.style.display = 'block';
        status.textContent = 'No entries yet.';
        return;
      }

      list.innerHTML = items.map(function (item) {
        return `
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
        `;
      }).join('');

      status.textContent = `${items.length} item${items.length === 1 ? '' : 's'} loaded.`;
      bindEntryActions();
    } catch (error) {
      status.textContent = error.message || 'Unable to load data.';
    }
  }

  function bindEntryActions() {
    document.querySelectorAll('[data-delete-id]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const entryId = button.dataset.deleteId;
        if (!window.confirm('Delete this entry?')) {
          return;
        }

        const response = await fetch(`/api/admin/${activeCollection}/${entryId}`, {
          method: 'DELETE'
        });
        const data = await readJsonResponse(response, 'Delete failed.');
        if (!response.ok) {
          alert(data.error || 'Delete failed.');
          return;
        }

        await loadOverview();
        await loadCollection(activeCollection);
      });
    });

    document.querySelectorAll('[data-update-id]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const entryId = button.dataset.updateId;
        const select = document.querySelector(`[data-status-id="${entryId}"]`);
        const nextStatus = select ? select.value : '';

        const response = await fetch(`/api/admin/testimonies/${entryId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: nextStatus })
        });

        const data = await readJsonResponse(response, 'Update failed.');
        if (!response.ok) {
          alert(data.error || 'Update failed.');
          return;
        }

        await loadCollection(activeCollection);
      });
    });
  }

  function bindTabs() {
    document.querySelectorAll('.admin-tab').forEach(function (tab) {
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
