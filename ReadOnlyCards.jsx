// Read-only card grid for student-facing lists (scholarships, career guides,
// study material, PYQs...). All text is rendered as plain text.
import { useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, Info } from 'lucide-react';
import { errMsg } from '../api/client';
import { useDebounce, useGet } from '../hooks/useApi';
import { safeUrl, EXTERNAL_LINK_PROPS } from '../utils/download';
import { Modal } from './Modal';
import { Badge, Button, Card, CardGridSkeleton, EmptyState, ErrorState, FilterBar, PageHeader, Pagination } from './ui';

// card = {
//   icon?, title(item), subtitle?(item), description?(item),
//   badges?(item) => [{ label, tone }], meta?(item) => [{ icon, text }],
//   href?(item), hrefLabel?, onDownload?(item), downloadLabel?
// }
export default function ReadOnlyCards({
  title,
  subtitle,
  endpoint,
  queryKey,
  filters = [],
  searchable = true,
  searchPlaceholder = 'Search…',
  perPage = 9,
  params,
  card,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  headerExtra,
}) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [filterVals, setFilterVals] = useState({});
  const [detailItem, setDetailItem] = useState(null);
  const filterKey = JSON.stringify(filterVals);
  useEffect(() => setPage(1), [dq, filterKey]);

  const query = useGet(
    queryKey || endpoint,
    endpoint,
    { page, per_page: perPage, q: dq, ...filterVals, ...(params || {}) },
    { placeholderData: (prev) => prev }
  );

  const items = query.data?.data || [];
  const filtered = Boolean(dq) || Object.values(filterVals).some(Boolean);
  const Icon = card.icon || FileText;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={headerExtra} />
      <FilterBar
        searchable={searchable}
        search={q}
        onSearch={setQ}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        values={filterVals}
        onChange={(name, value) => setFilterVals((f) => ({ ...f, [name]: value }))}
      />

      {query.isLoading ? (
        <CardGridSkeleton count={perPage > 6 ? 6 : perPage} />
      ) : query.isError ? (
        <Card>
          <ErrorState message={errMsg(query.error)} onRetry={() => query.refetch()} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title={filtered ? 'No matching results' : emptyTitle}
            message={filtered ? 'Try a different search or clear the filters.' : emptyMessage}
          />
        </Card>
      ) : (
        <>
          <ul
            className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${query.isFetching ? 'opacity-60' : ''}`}
            aria-busy={query.isFetching}
          >
            {items.map((item) => {
              const href = card.href ? safeUrl(card.href(item)) : null;
              const badges = card.badges ? card.badges(item).filter((b) => b.label) : [];
              const meta = card.meta ? card.meta(item).filter((m) => m.text) : [];
              return (
                <li key={item.id}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-accent-light">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold leading-snug">{card.title(item)}</h3>
                        {card.subtitle && (
                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{card.subtitle(item)}</p>
                        )}
                      </div>
                    </div>

                    {badges.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {badges.map((b) => (
                          <Badge key={b.label} tone={b.tone || 'blue'}>
                            {b.label}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {card.description && card.description(item) && (
                      <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                        {card.description(item)}
                      </p>
                    )}

                    {meta.length > 0 && (
                      <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {meta.map((m) => (
                          <li key={m.text} className="flex items-center gap-1.5">
                            {m.icon && <m.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                            {m.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {(href || card.onDownload || card.details) && (
                      <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        {card.details && (
                          <Button size="sm" variant="secondary" icon={Info} onClick={() => setDetailItem(item)}>
                            Read more
                          </Button>
                        )}
                        {card.onDownload && (
                          <Button size="sm" icon={Download} onClick={() => card.onDownload(item)}>
                            {card.downloadLabel || 'Download'}
                          </Button>
                        )}
                        {href && (
                          <a href={href} className="btn btn-secondary btn-sm" {...EXTERNAL_LINK_PROPS}>
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            {card.hrefLabel || 'Open link'}
                          </a>
                        )}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
          <Card flush className="mt-4">
            <Pagination meta={query.data?.meta} onPage={setPage} />
          </Card>
        </>
      )}

      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem ? card.title(detailItem) : ''}
        footer={
          <Button variant="secondary" onClick={() => setDetailItem(null)}>
            Close
          </Button>
        }
      >
        {detailItem &&
          card.details(detailItem)
            .filter((s) => s.text)
            .map((s) => (
              <section key={s.label} className="mb-4 last:mb-0">
                <h3 className="mb-1 text-sm font-semibold">{s.label}</h3>
                <p className="whitespace-pre-line break-words text-sm text-slate-600 dark:text-slate-300">{s.text}</p>
              </section>
            ))}
      </Modal>
    </div>
  );
}
