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

  function injectSiteChromeStyles() {
    if (document.getElementById('winepress-site-chrome-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'winepress-site-chrome-styles';
    style.textContent = `
      .wp-progress {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(107,26,42,.08);
        z-index: 1400;
        pointer-events: none;
      }

      .wp-progress-bar {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #6B1A2A 0%, #B05068 100%);
        box-shadow: 0 0 20px rgba(107,26,42,.3);
        transition: width 140ms ease-out;
      }

      .wp-menu-btn {
        display: none;
        border: 1px solid rgba(107,26,42,.16);
        background: rgba(255,255,255,.94);
        color: #6B1A2A;
        border-radius: 999px;
        padding: .75rem 1rem;
        font: 700 .66rem 'DM Sans', sans-serif;
        letter-spacing: .12em;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(107,26,42,.12);
      }

      .wp-menu-btn.is-overlay {
        display: inline-flex;
        align-items: center;
        gap: .45rem;
      }

      .wp-nav-overlay {
        position: fixed;
        inset: 0;
        background: rgba(18, 8, 8, .46);
        backdrop-filter: blur(10px);
        z-index: 1350;
        opacity: 0;
        pointer-events: none;
        transition: opacity 240ms ease;
      }

      .wp-nav-overlay.is-open {
        opacity: 1;
        pointer-events: auto;
      }

      .wp-nav-sheet {
        position: absolute;
        top: 0;
        right: 0;
        width: min(88vw, 360px);
        height: 100%;
        background: linear-gradient(180deg, #fff 0%, #faf4f2 100%);
        padding: 5.5rem 1.35rem 1.35rem;
        box-shadow: -20px 0 60px rgba(28,16,16,.16);
        transform: translateX(100%);
        transition: transform 280ms cubic-bezier(.22, 1, .36, 1);
        overflow-y: auto;
      }

      .wp-nav-overlay.is-open .wp-nav-sheet {
        transform: translateX(0);
      }

      .wp-nav-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
      }

      .wp-nav-sheet-links {
        display: grid;
        gap: .75rem;
        list-style: none;
      }

      .wp-nav-sheet-links a {
        display: block;
        padding: 1rem 1.05rem;
        border: 1px solid rgba(107,26,42,.08);
        border-radius: 16px;
        background: rgba(255,255,255,.88);
        color: #1C1010;
        font: 700 .74rem 'DM Sans', sans-serif;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .wp-floating-stack {
        position: fixed;
        left: 1rem;
        bottom: 1rem;
        z-index: 960;
        display: grid;
        gap: .7rem;
      }

      .wp-fab {
        border: none;
        border-radius: 999px;
        padding: .9rem 1.1rem;
        background: rgba(255,255,255,.96);
        color: #1C1010;
        font: 700 .68rem 'DM Sans', sans-serif;
        letter-spacing: .1em;
        text-transform: uppercase;
        cursor: pointer;
        box-shadow: 0 14px 34px rgba(28,16,16,.14);
        border: 1px solid rgba(107,26,42,.12);
        transform: translateY(16px);
        opacity: 0;
        pointer-events: none;
        transition:
          opacity 220ms ease,
          transform 260ms cubic-bezier(.22,1,.36,1),
          background-color 220ms ease,
          color 220ms ease;
      }

      .wp-fab.is-visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .wp-fab:hover {
        background: #6B1A2A;
        color: #fff;
      }

      @media (max-width: 900px) {
        nav {
          padding-left: 1rem !important;
          padding-right: 1rem !important;
        }

        .nav-links,
        .nav-pill {
          display: none !important;
        }

        .wp-menu-btn {
          display: inline-flex;
          align-items: center;
          gap: .45rem;
        }
      }

      @media (max-width: 680px) {
        .wp-floating-stack {
          left: auto;
          right: 1rem;
          bottom: 6.8rem;
        }

        .wp-fab {
          font-size: .62rem;
          padding: .82rem 1rem;
        }
      }
    `;

    document.head.appendChild(style);
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

  function initReadingProgress() {
    if (document.querySelector('.wp-progress')) {
      return;
    }

    const shell = document.createElement('div');
    shell.className = 'wp-progress';
    shell.innerHTML = '<div class="wp-progress-bar" id="wpProgressBar"></div>';
    document.body.appendChild(shell);

    const bar = shell.querySelector('#wpProgressBar');
    function updateProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(100, (scrollTop / maxScroll) * 100));
      bar.style.width = `${progress}%`;
    }

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  function initBackToTop() {
    let button = document.getElementById('backTop');

    if (!button) {
      button = document.createElement('button');
      button.id = 'backTop';
      button.type = 'button';
      button.className = 'wp-fab';
      button.textContent = 'Back to Top';
      document.body.appendChild(button);
    } else {
      button.classList.add('wp-fab');
      button.removeAttribute('onclick');
      if (!button.textContent.trim() || button.textContent.trim() === '↑') {
        button.textContent = 'Back to Top';
      }
    }

    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function syncVisibility() {
      button.classList.toggle('is-visible', window.scrollY > 420);
    }

    syncVisibility();
    window.addEventListener('scroll', syncVisibility, { passive: true });
  }

  function initShareAction() {
    if (document.getElementById('wpSharePage')) {
      return;
    }

    let stack = document.querySelector('.wp-floating-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'wp-floating-stack';
      document.body.appendChild(stack);
    }

    const shareButton = document.createElement('button');
    shareButton.type = 'button';
    shareButton.id = 'wpSharePage';
    shareButton.className = 'wp-fab is-visible';
    shareButton.textContent = 'Share Page';
    stack.appendChild(shareButton);

    shareButton.addEventListener('click', async function () {
      const payload = {
        title: document.title,
        text: document.title,
        url: window.location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(payload);
          return;
        }

        await navigator.clipboard.writeText(window.location.href);
        shareButton.textContent = 'Link Copied';
        window.setTimeout(function () {
          shareButton.textContent = 'Share Page';
        }, 1800);
      } catch {
        shareButton.textContent = 'Try Again';
        window.setTimeout(function () {
          shareButton.textContent = 'Share Page';
        }, 1800);
      }
    });
  }

  function initMobileNav() {
    const nav = document.querySelector('nav');
    const links = nav ? nav.querySelector('.nav-links') : null;
    if (!nav || !links || document.getElementById('wpMenuToggle')) {
      return;
    }

    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.id = 'wpMenuToggle';
    menuButton.className = 'wp-menu-btn';
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = 'Menu';
    nav.appendChild(menuButton);

    const overlay = document.createElement('div');
    overlay.className = 'wp-nav-overlay';
    overlay.innerHTML = `
      <div class="wp-nav-sheet">
        <button type="button" class="wp-menu-btn is-overlay wp-nav-close" id="wpMenuClose">Close</button>
        <ul class="wp-nav-sheet-links">${links.innerHTML}</ul>
      </div>
    `;
    document.body.appendChild(overlay);

    const sheetLinks = overlay.querySelectorAll('a');
    function closeMenu() {
      overlay.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    function openMenu() {
      overlay.classList.add('is-open');
      menuButton.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    menuButton.addEventListener('click', function () {
      if (overlay.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.querySelector('#wpMenuClose').addEventListener('click', closeMenu);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) {
        closeMenu();
      }
    });

    sheetLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) {
        closeMenu();
      }
    });
  }

  function initMotion() {
    injectSiteChromeStyles();
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
    initReadingProgress();
    initBackToTop();
    initShareAction();
    initMobileNav();
    attachSubscriptionForms();
    loadPrayerWall();
  });
})();
