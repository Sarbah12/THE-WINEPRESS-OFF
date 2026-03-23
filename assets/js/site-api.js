(function () {
  const STATUS_STYLE = 'margin-top:.8rem;font-size:.76rem;color:#6B1A2A;';
  const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
  const API_BASE = String(window.WINEPRESS_API_BASE || '').trim().replace(/\/$/, '');
  const WEB3FORMS_KEY = window.WINEPRESS_WEB3FORMS_KEY || 'YOUR_WEB3FORMS_ACCESS_KEY';

  function apiUrl(path) {
    return API_BASE ? `${API_BASE}${path}` : path;
  }

  async function request(url, payload) {
    const response = await fetch(apiUrl(url), {
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

  async function sendWeb3FormsEmail(options) {
    if (!WEB3FORMS_KEY || WEB3FORMS_KEY === 'YOUR_WEB3FORMS_ACCESS_KEY') {
      return { skipped: true };
    }

    const payload = {
      access_key: WEB3FORMS_KEY,
      from_name: 'The Winepress Website',
      subject: options.subject,
      ...options.fields
    };

    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Email notification could not be sent.');
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

  function togglePray(btn) {
    const prayed = btn.classList.toggle('prayed');
    btn.textContent = prayed ? 'Prayed!' : 'Pray';
  }

  function injectMotionStyles() {
    if (document.getElementById('winepress-motion-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'winepress-motion-styles';
    style.textContent = `
      .motion-reveal {
        opacity: 0;
        transform: translate3d(0, 28px, 0) scale(.985);
        transition:
          opacity 780ms cubic-bezier(.22, 1, .36, 1),
          transform 780ms cubic-bezier(.22, 1, .36, 1);
        will-change: opacity, transform;
      }

      .motion-reveal.is-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      .motion-soft {
        transition:
          transform 420ms cubic-bezier(.22, 1, .36, 1),
          box-shadow 420ms cubic-bezier(.22, 1, .36, 1),
          background-color 420ms cubic-bezier(.22, 1, .36, 1),
          border-color 420ms cubic-bezier(.22, 1, .36, 1),
          color 320ms cubic-bezier(.22, 1, .36, 1),
          opacity 320ms cubic-bezier(.22, 1, .36, 1);
      }

      @media (prefers-reduced-motion: reduce) {
        .motion-reveal,
        .motion-reveal.is-visible,
        .motion-soft {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function initMotion() {
    injectMotionStyles();

    const revealTargets = Array.from(document.querySelectorAll([
      '.hero-content',
      '.page-hero',
      '.hero',
      '.intro-band',
      '.blog-section',
      '.afua-section',
      '.mission',
      '.connect',
      '.sub',
      '.sub-band',
      '.testi',
      '.res',
      '.prayer-wall',
      '.form-section',
      '.entry-card',
      '.metric',
      '.workspace',
      '.info-card',
      '.pw-card',
      '.t-card',
      '.dv-small',
      '.r-tile',
      '.ps-item',
      '.strip-item',
      '.jp-card',
      '.book-card',
      '.resource-card'
    ].join(',')));

    revealTargets.forEach(function (element, index) {
      if (element.dataset.motionBound === 'true') {
        return;
      }

      element.dataset.motionBound = 'true';
      element.classList.add('motion-reveal');
      element.style.transitionDelay = `${Math.min(index % 6, 5) * 70}ms`;
    });

    document.querySelectorAll('a, button, .nav-pill, .btn-wine, .btn-outline, .btn-white, .btn-res, .prayer-chip, .pw-pray-btn, .t-card, .dv-small, .r-tile').forEach(function (element) {
      element.classList.add('motion-soft');
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealTargets.forEach(function (element) {
        element.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px'
    });

    revealTargets.forEach(function (element) {
      observer.observe(element);
    });
  }

  function sourceFromPage() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '');
    return page || 'home';
  }

  async function submitSubscription(form) {
    const nameInput = form.querySelector('input');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      updateStatus(form, 'Please enter your name first.', true);
      return;
    }

    setSubmitting(form, true);
    updateStatus(form, 'Saving your subscription...', false);

    try {
      await request('/api/subscriptions', {
        name,
        source: form.dataset.source || sourceFromPage()
      });
      form.reset();
      updateStatus(form, 'You are on the list. Thank you for subscribing to The Winepress.', false);
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
      const response = await fetch(apiUrl('/api/prayer-wall'));
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
    apiUrl,
    sendWeb3FormsEmail,
    attachSubscriptionForms,
    loadPrayerWall,
    setSubmitting,
    updateStatus
  };
  window.togglePray = togglePray;

  document.addEventListener('DOMContentLoaded', function () {
    initMotion();
    attachSubscriptionForms();
    loadPrayerWall();
  });
})();
