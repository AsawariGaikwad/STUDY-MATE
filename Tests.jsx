// Student: list of mock tests with the state of each attempt.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ClipboardList, Clock, MinusCircle } from 'lucide-react';
import { errMsg } from '../api/client';
import { useGet } from '../hooks/useApi';
import { formatDateTime } from '../utils/format';
import { Badge, Button, Card, CardGridSkeleton, EmptyState, ErrorState, PageHeader, Pagination, cx } from '../components/ui';

const isSubmitted = (a) => !!a && (!!a.submitted_at || /SUBMIT|COMPLETE|EVALUAT/i.test(a.status || ''));

function stateOf(t, now) {
  if (t.attempt) return isSubmitted(t.attempt) ? 'done' : 'progress';
  const start = Date.parse(t.start_at);
  const end = Date.parse(t.end_at);
  if (start > now) return 'upcoming';
  if (end < now) return 'closed';
  return 'open';
}

export default function Tests() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const query = useGet('tests', '/tests', { page, per_page: 9 }, { placeholderData: (p) => p });
  const items = query.data?.data || [];
  const now = Date.now();

  return (
    <div>
      <PageHeader title="Mock tests" subtitle="Timed tests set by your faculty. Each test can be attempted once." />

      {query.isLoading ? (
        <CardGridSkeleton count={6} />
      ) : query.isError ? (
        <Card>
          <ErrorState message={errMsg(query.error)} onRetry={() => query.refetch()} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="No tests yet" message="Tests your faculty publishes will show up here." />
        </Card>
      ) : (
        <>
          <ul className={cx('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', query.isFetching && 'opacity-60')}>
            {items.map((t) => {
              const state = stateOf(t, now);
              const a = t.attempt;
              return (
                <li key={t.id}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold leading-snug">{t.title}</h2>
                      {state === 'done' && <Badge tone="green">Completed</Badge>}
                      {state === 'progress' && <Badge tone="amber">In progress</Badge>}
                      {state === 'upcoming' && <Badge tone="blue">Upcoming</Badge>}
                      {state === 'closed' && <Badge tone="gray">Closed</Badge>}
                      {state === 'open' && <Badge tone="green">Open</Badge>}
                    </div>
                    {(t.subject_name || t.exam_name) && (
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {[t.subject_name, t.exam_name].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {t.description && (
                      <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{t.description}</p>
                    )}

                    <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <li className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        {t.duration_minutes} minutes
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDateTime(t.start_at)} – {formatDateTime(t.end_at)}
                      </li>
                      {Number(t.negative_marking) > 0 && (
                        <li className="flex items-center gap-1.5">
                          <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Negative marking applies
                        </li>
                      )}
                    </ul>

                    <div className="mt-auto pt-4">
                      {state === 'done' && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm">
                            Score: <strong>{a.score ?? '—'}</strong>
                            {a.total_marks != null && <span className="text-slate-500"> / {a.total_marks}</span>}
                          </p>
                          <Button size="sm" variant="secondary" onClick={() => navigate(`/tests/${t.id}/result`)}>
                            View result
                          </Button>
                        </div>
                      )}
                      {state === 'progress' && (
                        <Button size="sm" onClick={() => navigate(`/tests/${t.id}/take`)}>
                          Resume test
                        </Button>
                      )}
                      {state === 'open' && (
                        <Button size="sm" onClick={() => navigate(`/tests/${t.id}/take`)}>
                          Start test
                        </Button>
                      )}
                      {state === 'upcoming' && <p className="text-sm text-slate-500">Opens {formatDateTime(t.start_at)}</p>}
                      {state === 'closed' && <p className="text-sm text-slate-500">This test is closed.</p>}
                    </div>
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
    </div>
  );
}
