import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Eraser, Send } from 'lucide-react';
import { api, errCode, errMsg } from '../api/client';
import { useAction } from '../hooks/useApi';
import { formatClock } from '../utils/format';
import { ConfirmDialog } from '../components/Modal';
import { Button, Card, EmptyState, Skeleton, SkeletonText, cx } from '../components/ui';

// Friendly wording for the ways a test can refuse to start.
function startProblem(err) {
  const text = `${errCode(err) || ''} ${errMsg(err, '')}`.toLowerCase();
  if (/not[_ ]?started|not yet|upcoming|not open/.test(text))
    return { title: 'This test has not started yet', message: 'Check the schedule on the tests page and come back when it opens.' };
  if (/closed|ended|expired/.test(text))
    return { title: 'This test is closed', message: 'The time window for this test is over.' };
  if (/already|attempted|submitted/.test(text))
    return { title: 'You have already attempted this test', message: 'Each test can be attempted once. You can review your result.', result: true };
  return { title: 'Could not start the test', message: errMsg(err) };
}

function StartProblem({ err, testId }) {
  const p = startProblem(err);
  return (
    <Card>
      <EmptyState
        icon={AlertTriangle}
        title={p.title}
        message={p.message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/tests" className="btn btn-secondary">
              Back to tests
            </Link>
            {p.result && (
              <Link to={`/tests/${testId}/result`} className="btn btn-primary">
                View result
              </Link>
            )}
          </div>
        }
      />
    </Card>
  );
}

function Attempt({ data, testId }) {
  const { test, remaining_seconds: remaining } = data;
  const questions = [...(data.questions || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);
  const deadline = useRef(Date.now() + Math.max(0, Number(remaining) || 0) * 1000);
  const [left, setLeft] = useState(Math.max(0, Math.ceil(Number(remaining) || 0)));
  const done = useRef(false);
  const autoTried = useRef(false);

  const submit = useAction(({ auto }) => api.post(`/tests/${testId}/submit`, { answers, auto }), {
    onSuccess: (_r, { auto }) => {
      done.current = true;
      ['tests', 'dashboard', 'performance', 'test-result'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(auto ? 'Time is up. Your test was submitted.' : 'Test submitted');
      navigate(`/tests/${testId}/result`, { replace: true });
    },
    onError: (err, { auto }) => {
      if (/already/.test(`${errCode(err)} ${errMsg(err, '')}`.toLowerCase())) {
        done.current = true;
        navigate(`/tests/${testId}/result`, { replace: true });
        return;
      }
      if (auto) setAutoFailed(true);
    },
  });

  const doSubmit = (auto = false) => {
    if (done.current || submit.isPending) return;
    setConfirm(false);
    submit.mutate({ auto });
  };
  const submitRef = useRef(doSubmit);
  submitRef.current = doSubmit;

  // Countdown from the server's remaining_seconds; auto-submit at zero.
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setLeft(r);
      if (r <= 0 && !autoTried.current && !done.current) {
        autoTried.current = true;
        submitRef.current(true);
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Warn before the tab is closed or reloaded mid-test.
  useEffect(() => {
    const warn = (e) => {
      if (done.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (questions.length === 0) {
    return (
      <Card>
        <EmptyState title="This test has no questions" message="Please contact your faculty." action={<Link to="/tests" className="btn btn-secondary">Back to tests</Link>} />
      </Card>
    );
  }

  const q = questions[index];
  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;
  const urgent = left <= 60;

  const choose = (key) => setAnswers((a) => ({ ...a, [q.id]: key }));
  const clear = () =>
    setAnswers((a) => {
      const next = { ...a };
      delete next[q.id];
      return next;
    });

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">{test?.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Question {index + 1} of {questions.length} · {answered} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              role="timer"
              aria-label="Time remaining"
              className={cx(
                'flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-semibold tabular-nums',
                urgent ? 'animate-pulse bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-brand-50 text-brand-900 dark:bg-slate-800 dark:text-white'
              )}
            >
              <Clock className="h-5 w-5" aria-hidden="true" />
              {formatClock(left)}
            </div>
            <Button icon={Send} onClick={() => setConfirm(true)} loading={submit.isPending}>
              Submit
            </Button>
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {left === 60 ? 'One minute remaining' : left === 300 ? 'Five minutes remaining' : ''}
        </p>
      </div>

      {autoFailed && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>Time is up, but your answers could not be submitted. Check your connection and try again.</span>
          <Button size="sm" variant="danger" onClick={() => submitRef.current(true)} loading={submit.isPending}>
            Retry submit
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Question {index + 1} · {q.marks} {Number(q.marks) === 1 ? 'mark' : 'marks'}
            </legend>
            <p className="mb-5 whitespace-pre-line break-words text-base font-medium leading-relaxed text-slate-900 dark:text-white">{q.text}</p>
            <div className="space-y-3">
              {Object.entries(q.options || {}).map(([key, label]) => {
                const checked = answers[q.id] === key;
                return (
                  <label key={key} className="block cursor-pointer">
                    <input type="radio" name={`q-${q.id}`} value={key} checked={checked} onChange={() => choose(key)} className="peer sr-only" />
                    <span
                      className={cx(
                        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:peer-focus-visible:ring-accent-light',
                        checked
                          ? 'border-brand-700 bg-brand-50 text-brand-900 dark:border-accent dark:bg-slate-800 dark:text-white'
                          : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <span
                        className={cx(
                          'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                          checked ? 'bg-brand-800 text-white dark:bg-accent dark:text-brand-950' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                        )}
                      >
                        {key}
                      </span>
                      <span className="min-w-0 whitespace-pre-line break-words pt-0.5">{label}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" icon={Eraser} onClick={clear} disabled={!answers[q.id]}>
              Clear answer
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
                Previous
              </Button>
              <Button onClick={() => setIndex((i) => i + 1)} disabled={index === questions.length - 1}>
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="h-fit lg:sticky lg:top-44">
          <h2 className="mb-3 text-sm font-semibold">Questions</h2>
          <ol className="grid grid-cols-5 gap-2">
            {questions.map((item, i) => {
              const isAnswered = !!answers[item.id];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Question ${i + 1}, ${isAnswered ? 'answered' : 'not answered'}`}
                    aria-current={i === index ? 'step' : undefined}
                    className={cx(
                      'h-9 w-full rounded-lg text-sm font-semibold transition-colors',
                      isAnswered ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                      i === index && 'ring-2 ring-brand-700 ring-offset-2 ring-offset-white dark:ring-accent dark:ring-offset-slate-900'
                    )}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" aria-hidden="true" /> Answered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" aria-hidden="true" /> Not answered
            </span>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Submit test?"
        message={
          unanswered > 0
            ? `You have ${unanswered} unanswered ${unanswered === 1 ? 'question' : 'questions'}. You cannot change your answers after submitting.`
            : 'You have answered every question. You cannot change your answers after submitting.'
        }
        confirmLabel="Submit test"
        loading={submit.isPending}
        onConfirm={() => doSubmit(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

export default function TakeTest() {
  const { id } = useParams();
  // POST /start resumes an attempt that is already in progress.
  const start = useQuery({
    queryKey: ['test-start', id],
    queryFn: () => api.post(`/tests/${id}/start`),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  if (start.isLoading) {
    return (
      <div role="status" aria-label="Loading test">
        <Skeleton className="mb-6 h-14 w-full" />
        <Card className="space-y-4">
          <SkeletonText lines={3} />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    );
  }
  if (start.isError) return <StartProblem err={start.error} testId={id} />;
  return <Attempt data={start.data.data} testId={id} />;
}
