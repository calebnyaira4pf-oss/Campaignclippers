import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items, withSchema = true }: { items: Crumb[]; withSchema?: boolean }) {
  useEffect(() => {
    if (!withSchema) return;
    const prev = document.getElementById('breadcrumb-jsonld');
    if (prev) prev.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.label,
        ...(item.to ? { item: window.location.origin + item.to } : {}),
      })),
    });
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [items.map((i) => i.label + (i.to || '')).join('|'), withSchema]);

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 flex-wrap text-[13px]">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5 min-w-0">
              {item.to && !last ? (
                <Link to={item.to} className="font-bold text-mut hover:text-white transition-colors whitespace-nowrap">{item.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={`font-bold truncate ${last ? 'text-white' : 'text-mut'}`}>{item.label}</span>
              )}
              {!last && <ChevronRight size={13} className="text-faint shrink-0" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
