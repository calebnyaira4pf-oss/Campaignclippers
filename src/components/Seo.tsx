import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}

function ensureMeta(attr: 'name' | 'property', key: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

export default function Seo({ title, description, path, noindex = false, jsonLd }: SeoProps) {
  useEffect(() => {
    document.title = title;
    ensureMeta('property', 'og:title').content = title;
    ensureMeta('name', 'twitter:title').content = title;

    if (description) {
      ensureMeta('name', 'description').content = description;
      ensureMeta('property', 'og:description').content = description;
      ensureMeta('name', 'twitter:description').content = description;
    }

    const href = window.location.origin + (path ?? window.location.pathname);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = href;
    ensureMeta('property', 'og:url').content = href;

    ensureMeta('name', 'robots').content = noindex ? 'noindex, nofollow' : 'index, follow';

    const prev = document.getElementById('page-jsonld');
    if (prev) prev.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'page-jsonld';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, noindex, jsonLd ? JSON.stringify(jsonLd) : '']);

  return null;
}
