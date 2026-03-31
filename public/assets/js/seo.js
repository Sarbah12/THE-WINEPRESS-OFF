(function () {
  const defaults = {
    siteName: 'The Winepress',
    siteUrl: 'https://thewinepressofficial.com',
    locale: 'en_GH',
    type: 'website',
    pageType: 'WebPage',
    image: '/assets/images/background.png',
    keywords: [
      'Christian blog',
      'Bible study',
      'devotionals',
      'faith and psychology',
      'Christian mental health',
      'Christ-centred life',
      'mental well-being',
      'wholeness journey',
      'faith encouragement',
      'Christian testimonies',
      'The Winepress',
      'The Winepress official',
      'thewinepressofficial.com'
    ],
    author: 'Afua',
    organization: {
      name: 'The Winepress',
      alternateName: ['The Winepress Official', 'The Winepress by Afua'],
      description: 'A Christ-centred space where faith and psychology intersect through biblical reflections, honest conversations, mental well-being support, and stories of wholeness.',
      sameAs: [
        'https://www.instagram.com/thewinepress_?igsh=NG5tdWk3bGJpdXEw',
        'https://www.whatsapp.com/channel/0029Vb6NqD27z4kZwHc2Mh3B'
      ]
    }
  };

  const config = Object.assign({}, defaults, window.WINEPRESS_SEO || {});

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') {
      return '/';
    }
    return pathname.endsWith('/') ? pathname : pathname.replace(/\.html$/, '').replace(/\/?$/, '/');
  }

  function getSiteUrl() {
    const configured = config.siteUrl || window.WINEPRESS_SITE_URL || document.documentElement.getAttribute('data-site-url');
    if (configured) {
      return configured.replace(/\/+$/, '');
    }
    return window.location.origin.replace(/\/+$/, '');
  }

  function buildUrl(pathname) {
    const siteUrl = getSiteUrl();
    const normalizedPath = normalizePath(pathname || config.path || window.location.pathname);
    return new URL(normalizedPath, siteUrl).toString();
  }

  function upsertMeta(selector, attributes) {
    let node = document.head.querySelector(selector);
    if (!node) {
      node = document.createElement('meta');
      document.head.appendChild(node);
    }
    Object.entries(attributes).forEach(([key, value]) => {
      node.setAttribute(key, value);
    });
    return node;
  }

  function upsertLink(rel, href) {
    let node = document.head.querySelector(`link[rel="${rel}"]`);
    if (!node) {
      node = document.createElement('link');
      node.setAttribute('rel', rel);
      document.head.appendChild(node);
    }
    node.setAttribute('href', href);
    return node;
  }

  const canonicalUrl = buildUrl(config.path);
  const imageUrl = new URL(config.image || defaults.image, getSiteUrl()).toString();
  const title = config.title || document.title || defaults.siteName;
  const description = config.description || defaults.organization.description;
  const robots = config.index === false ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';

  document.title = title;

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[name="keywords"]', { name: 'keywords', content: (config.keywords || defaults.keywords).join(', ') });
  upsertMeta('meta[name="author"]', { name: 'author', content: config.author || defaults.author });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });

  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: config.type || defaults.type });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: config.siteName || defaults.siteName });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: config.locale || defaults.locale });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });

  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

  upsertLink('canonical', canonicalUrl);

  const schemaNodes = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: defaults.organization.name,
      alternateName: defaults.organization.alternateName,
      description: defaults.organization.description,
      url: getSiteUrl(),
      logo: imageUrl,
      sameAs: defaults.organization.sameAs,
      founder: {
        '@type': 'Person',
        name: 'Afua',
        jobTitle: 'Founder'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: config.siteName || defaults.siteName,
      url: getSiteUrl(),
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${getSiteUrl()}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': config.pageType || defaults.pageType,
      name: title,
      description: description,
      url: canonicalUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: config.siteName || defaults.siteName,
        url: getSiteUrl()
      },
      about: config.about || ['Christian growth', 'Bible study', 'faith encouragement'],
      image: imageUrl
    }
  ];

  if (config.pageType === 'Article') {
    schemaNodes[2].headline = title;
    schemaNodes[2].author = {
      '@type': 'Organization',
      name: defaults.organization.name
    };
    schemaNodes[2].publisher = {
      '@type': 'Organization',
      name: defaults.organization.name,
      logo: {
        '@type': 'ImageObject',
        url: imageUrl
      }
    };
    schemaNodes[2].mainEntityOfPage = canonicalUrl;
    schemaNodes[2].articleSection = config.articleSection || 'Bible Study';
  }

  if (config.pageType === 'ContactPage') {
    schemaNodes[2].contactPoint = [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: ['English']
      }
    ];
  }

  let schemaScript = document.getElementById('winepress-seo-schema');
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    schemaScript.id = 'winepress-seo-schema';
    document.head.appendChild(schemaScript);
  }
  schemaScript.textContent = JSON.stringify(schemaNodes);
})();
