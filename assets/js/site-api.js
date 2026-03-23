(function () {
  const STATUS_STYLE = 'margin-top:.8rem;font-size:.76rem;color:#6B1A2A;';

  async function request(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    return data;
  }

  function ensureStatusNode(form) {
    let status = form.nextElementSibling;
    if (!status || !status.classList.contains('js-form-status')) {
      status = document.createElement('p');
      status.className = 'js-form-status';
      status.style = STATUS_STYLE;
      form.insertAdjacentElement('afterend', status);
    }
    return status;
  }

  function updateStatus(form, message, isError) {
    const status = ensureStatusNode(form);
    status.textContent = message;
    status.style.color = isError ? '#8C2438' : '#6B1A2A';
  }

  function setSubmitting(form, submitting) {
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = submitting;
      button.style.opacity = submitting ? '0.7' : '1';
      button.style.cursor = submitting ? 'wait' : 'pointer';
    }
  }

  function sourceFromPage() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');
    return page || 'home';
  }

  async function submitSubscription(form) {
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
      updateStatus(form, 'Please enter your email address first.', true);
      return;
    }

    setSubmitting(form, true);
    updateStatus(form, 'Saving your subscription...', false);

    try {
      await request('/api/subscriptions', {
        email,
        source: form.dataset.source || sourceFromPage()
      });
      form.reset();
      updateStatus(form, 'You are subscribed. New Winepress updates will come to your inbox.', false);
    } catch (error) {
      updateStatus(form, error.message, true);
    } finally {
      setSubmitting(form, false);
    }
  }

  function attachSubscriptionForms() {
    document.querySelectorAll('.sub-form').forEach(function (form) {
      if (form.dataset.apiBound === 'true') {
        return;
      }

      form.dataset.apiBound = 'true';
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitSubscription(form);
      });
    });
  }

  async function loadPrayerWall() {
    const grid = document.getElementById('prayerWallGrid');
    if (!grid) {
      return;
    }

    try {
      const response = await fetch('/api/prayer-wall');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) {
        throw new Error('Unable to load prayer wall right now.');
      }

      grid.innerHTML = data.items.map(function (item) {
        return `
          <div class="pw-card">
            <span class="pw-category">${item.safeCategory}</span>
            <p class="pw-text">"${item.safeText}"</p>
            <div class="pw-footer">
              <span class="pw-anon">Anonymous · ${item.timeLabel}</span>
              <button class="pw-pray-btn" onclick="togglePray(this)">Pray</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      grid.innerHTML = `
        <div class="pw-card" style="grid-column:1 / -1;">
          <span class="pw-category">Prayer Wall</span>
          <p class="pw-text">We could not load the live prayer wall right now, but you can still send your request.</p>
          <div class="pw-footer">
            <span class="pw-anon">Please try again shortly.</span>
          </div>
        </div>
      `;
    }
  }

  window.WinepressAPI = {
    request,
    attachSubscriptionForms,
    loadPrayerWall,
    setSubmitting,
    updateStatus
  };

  document.addEventListener('DOMContentLoaded', function () {
    attachSubscriptionForms();
    loadPrayerWall();
  });
})();
