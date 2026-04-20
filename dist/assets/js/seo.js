(function () {
  const defaults = {
    siteName: 'The Winepress Official',
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
      name: 'The Winepress Official',
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

  function inferPageType(pageType, pathname) {
    if (pageType) {
      return pageType;
    }
    if (pathname === '/') {
      return 'WebPage';
    }
    return defaults.pageType;
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
  const siteName = config.siteName || defaults.siteName;
  const pageType = inferPageType(config.pageType, normalizePath(config.path || window.location.pathname));
  const imageAlt = config.imageAlt || `${title} | ${siteName}`;
  const keywords = config.keywords || defaults.keywords;

  document.title = title;

  upsertMeta('meta[name="description"]', { name: 'description', content: description });
  upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywords.join(', ') });
  upsertMeta('meta[name="author"]', { name: 'author', content: config.author || defaults.author });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: robots });
  upsertMeta('meta[name="googlebot"]', { name: 'googlebot', content: robots });
  upsertMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#6B1A2A' });

  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: config.type || defaults.type });
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: config.siteName || defaults.siteName });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: config.locale || defaults.locale });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: imageAlt });
  upsertMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: String(config.imageWidth || 1200) });
  upsertMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: String(config.imageHeight || 630) });

  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
  upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: imageAlt });
  upsertMeta('meta[name="twitter:url"]', { name: 'twitter:url', content: canonicalUrl });

  upsertLink('canonical', canonicalUrl);

  const organizationNode = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${getSiteUrl()}/#organization`,
    name: defaults.organization.name,
    alternateName: defaults.organization.alternateName,
    description: defaults.organization.description,
    url: getSiteUrl(),
    logo: {
      '@type': 'ImageObject',
      url: imageUrl
    },
    image: imageUrl,
    sameAs: defaults.organization.sameAs,
    brand: {
      '@type': 'Brand',
      name: defaults.organization.name
    },
    founder: {
      '@type': 'Person',
      name: 'Afua',
      jobTitle: 'Founder'
    }
  };

  const websiteNode = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${getSiteUrl()}/#website`,
    name: siteName,
    url: getSiteUrl(),
    description: defaults.organization.description,
    inLanguage: 'en',
    publisher: {
      '@id': `${getSiteUrl()}/#organization`
    }
  };

  const pageNode = {
    '@context': 'https://schema.org',
    '@type': pageType,
    '@id': `${canonicalUrl}#webpage`,
    name: title,
    headline: title,
    description: description,
    url: canonicalUrl,
    isPartOf: {
      '@id': `${getSiteUrl()}/#website`
    },
    about: config.about || ['Christian growth', 'Bible study', 'faith encouragement'],
    keywords: keywords,
    inLanguage: 'en',
    image: {
      '@type': 'ImageObject',
      url: imageUrl
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: imageUrl
    },
    author: {
      '@type': 'Person',
      name: config.author || defaults.author
    },
    publisher: {
      '@id': `${getSiteUrl()}/#organization`
    }
  };

  const schemaNodes = [organizationNode, websiteNode, pageNode];

  if (pageType === 'Article') {
    pageNode.author = {
      '@type': 'Organization',
      name: defaults.organization.name
    };
    pageNode.publisher = {
      '@id': `${getSiteUrl()}/#organization`
    };
    pageNode.mainEntityOfPage = canonicalUrl;
    pageNode.articleSection = config.articleSection || 'Bible Study';
    if (config.datePublished) {
      pageNode.datePublished = config.datePublished;
      upsertMeta('meta[property="article:published_time"]', { property: 'article:published_time', content: config.datePublished });
    }
    if (config.dateModified) {
      pageNode.dateModified = config.dateModified;
      upsertMeta('meta[property="article:modified_time"]', { property: 'article:modified_time', content: config.dateModified });
    }
    if (Array.isArray(config.tags) && config.tags.length > 0) {
      pageNode.articleBody = config.articleSummary;
      config.tags.forEach((tag, index) => {
        upsertMeta(`meta[property="article:tag"][data-seo-tag="${index}"]`, {
          property: 'article:tag',
          content: tag,
          'data-seo-tag': String(index)
        });
      });
    }
  }

  if (pageType === 'ContactPage') {
    pageNode.contactPoint = [
      {
        '@type': 'ContactPoint',
        contactType: 'Prayer requests and general enquiries',
        availableLanguage: ['English']
      }
    ];
  }

  if (pageType === 'CollectionPage' && Array.isArray(config.itemList) && config.itemList.length > 0) {
    pageNode.mainEntity = {
      '@type': 'ItemList',
      itemListElement: config.itemList.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: buildUrl(item.path)
      }))
    };
  }

  if (pageType === 'Blog') {
    pageNode.blogPost = Array.isArray(config.itemList)
      ? config.itemList.map((item) => ({
          '@type': 'BlogPosting',
          headline: item.name,
          url: buildUrl(item.path)
        }))
      : undefined;
  }

  if (Array.isArray(config.breadcrumbs) && config.breadcrumbs.length > 0) {
    schemaNodes.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: config.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: buildUrl(item.path)
      }))
    });
  }

  if (Array.isArray(config.faqs) && config.faqs.length > 0) {
    schemaNodes.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: config.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    });
  }

  if (config.person) {
    schemaNodes.push({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${getSiteUrl()}/#person-afua`,
      name: config.person.name || defaults.author,
      description: config.person.description,
      jobTitle: config.person.jobTitle,
      worksFor: {
        '@id': `${getSiteUrl()}/#organization`
      },
      sameAs: config.person.sameAs || []
    });
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
