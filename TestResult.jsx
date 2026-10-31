import { Link, useParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { errMsg } from '../api/client';
import { useGet } from '../hooks/useApi';
import { formatDateTime, formatPercent } from '../utils/format';
import { Badge, Card, ErrorState, PageHeader, Skeleton, StatCard, cx } from '../components/ui';

export default function TestResult() {
  const { id } = useParams();
  const query = useGet(['test-result', id], `/tests/${id}/result`);
  const r = query.data?.data;

  const back = (
    <Link to="/tests" className="btn btn-secondary">
      Back to tests
    </Link>
  );

  if (query.isError) {
    return (
      <div>
        <PageHeader title="Test result" actions={back} />
        <Card>
          <ErrorState message={errMsg(query.error)} onRetry={() => query.refetch()} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Test result"
        subtitle={r?.submitted_at ? `Submitted ${formatDateTime(r.submitted_at)}` : undefined}
        actions={back}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Score" loading={query.isLoading} value={r ? `${r.score} / ${r.total_marks}` : null} />
        <StatCard label="Percentage" loading={query.isLoading} value={r ? formatPercent(r.percentage) : null} />
        <StatCard label="Correct" loading={query.isLoading} value={r?.correct} />
        <StatCard label="Wrong" loading={query.isLoading} value={r?.wrong} />
        <StatCard label="Unanswered" loading={query.isLoading} value={r?.unanswered} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Review</h2>
      {query.isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading review">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (r?.review || []).length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">There is nothing to review for this test.</p>
        </Card>
      ) : (
        <ol className="space-y-4">
          {r.review.map((item, i) => {
            const unanswered = !item.your_answer;
            return (
              <li key={i}>
                <Card>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Question {i + 1}</p>
                    {unanswered ? <Badge tone="gray">Unanswered</Badge> : item.is_correct ? <Badge tone="green">Correct</Badge> : <Badge tone="red">Wrong</Badge>}
                  </div>
                  <p className="mb-4 whitespace-pre-line break-words font-medium text-slate-900 dark:text-white">{item.text}</p>
                  <ul className="space-y-2">
                    {Object.entries(item.options || {}).map(([key, label]) => {
                      const isCorrect = key === item.correct_option;
                      const isYours = key === item.your_answer;
                      return (
                        <li
                          key={key}
                          className={cx(
                            'flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm',
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : isYours
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                              : 'border-slate-200 dark:border-slate-700'
                          )}
                        >
                          <span className="font-semibold">{key}.</span>
                          <span className="min-w-0 flex-1 whitespace-pre-line break-words">{label}</span>
                          {isCorrect && (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <Check className="h-4 w-4" aria-hidden="true" /> Correct answer
                            </span>
                          )}
                          {isYours && !isCorrect && (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                              <X className="h-4 w-4" aria-hidden="true" /> Your answer
                            </span>
                          )}
                          {isYours && isCorrect && <span className="sr-only">(your answer)</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {item.explanation && (
                    <p className="mt-3 whitespace-pre-line break-words rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:bg-slate-800 dark:text-slate-200">
                      <strong>Explanation: </strong>
                      {item.explanation}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
