import { Card, EmptyState, ErrorState, Pagination, Skeleton, cx } from './ui';

// columns: [{ key, header, render?(row), className?, headerClassName? }]
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  fetching = false,
  error = null,
  onRetry,
  meta,
  onPage,
  rowKey = 'id',
  skeletonRows = 6,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  caption,
}) {
  if (error) {
    return (
      <Card flush>
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  const showEmpty = !loading && rows.length === 0;

  return (
    <Card flush className="overflow-hidden">
      {showEmpty ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} action={emptyAction} />
      ) : (
        <div className={cx('overflow-x-auto transition-opacity', fetching && 'opacity-60')}>
          <table className="w-full min-w-[40rem] border-collapse" aria-busy={loading || fetching}>
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={cx('th', c.headerClassName)}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading
                ? Array.from({ length: skeletonRows }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {columns.map((c) => (
                        <td key={c.key} className="td">
                          <Skeleton className="h-4 w-full max-w-[10rem]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row, i) => (
                    <tr
                      key={row[rowKey] ?? i}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={cx('td', c.className)}>
                          {c.render ? c.render(row) : row[c.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !showEmpty && meta && (
        <Pagination meta={meta} onPage={onPage} className="border-t border-slate-200 dark:border-slate-800" />
      )}
    </Card>
  );
}
