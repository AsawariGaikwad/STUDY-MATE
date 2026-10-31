// Small, reusable UI primitives.
import { forwardRef } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { errMsg } from '../api/client';
import { useOptions } from '../hooks/useApi';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export function Spinner({ className }) {
  return <Loader2 className={cx('h-4 w-4 animate-spin', className)} aria-hidden="true" />;
}

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size, loading = false, icon: Icon, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('btn', VARIANTS[variant], size === 'sm' && 'btn-sm', className)}
      {...rest}
    >
      {loading ? <Spinner /> : Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export function IconButton({ icon: Icon, label, className, tone, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
        tone === 'danger' && 'hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/50 dark:hover:!text-red-400',
        className
      )}
      {...rest}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function Card({ className, flush = false, children, ...rest }) {
  return (
    <div className={cx('card', flush && '!p-0', className)} {...rest}>
      {children}
    </div>
  );
}

const TONES = {
  blue: 'badge-blue',
  green: 'badge-green',
  amber: 'badge-amber',
  red: 'badge-red',
  gray: 'badge-gray',
};

export function Badge({ tone = 'gray', className, children }) {
  return <span className={cx('badge', TONES[tone], className)}>{children}</span>;
}

// Map server status strings to badge tones
export function toneFor(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
    case 'PRESENT':
    case 'ACTIVE':
    case 'SUCCESS':
    case 'SUBMITTED':
    case 'PUBLISHED':
      return 'green';
    case 'PARTIAL':
    case 'LATE':
    case 'LEAVE':
    case 'IN_PROGRESS':
    case 'DRAFT':
      return 'amber';
    case 'PENDING':
    case 'ABSENT':
    case 'FAILURE':
    case 'FAILED':
    case 'INACTIVE':
      return 'red';
    default:
      return 'gray';
  }
}

export function Skeleton({ className, style }) {
  return <div className={cx('skeleton', className)} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cx('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cx('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className }) {
  return (
    <div
      className={cx('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <SkeletonText lines={3} />
          <Skeleton className="h-8 w-28" />
        </Card>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-accent-light">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'We could not load this.', onRetry, className }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} className="mt-5" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

// Renders skeleton / error / empty / content from a TanStack query result.
export function QueryState({ query, skeleton, isEmpty, empty, children }) {
  if (query.isLoading) return skeleton ?? <SkeletonText lines={4} />;
  if (query.isError) return <ErrorState message={errMsg(query.error)} onRetry={() => query.refetch()} />;
  if (isEmpty && isEmpty(query.data)) return empty ?? <EmptyState title="Nothing here yet" />;
  return children;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, hint, loading = false }) {
  const display = value === null || value === undefined || value === '' ? '—' : value;
  return (
    <Card className="flex items-start gap-4">
      {Icon && (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-accent-light">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-20" />
        ) : (
          <p className="mt-0.5 truncate font-heading text-2xl font-semibold text-brand-900 dark:text-white">
            {display}
          </p>
        )}
        {hint && !loading && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
    </Card>
  );
}

export function Field({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function pageWindow(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

export function Pagination({ meta, onPage, className }) {
  if (!meta) return null;
  const page = meta.page || 1;
  const pages = meta.pages || 1;
  const total = meta.total ?? 0;
  const perPage = meta.per_page || 10;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const nav =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm transition-colors disabled:opacity-40';

  return (
    <nav
      aria-label="Pagination"
      className={cx('flex flex-wrap items-center justify-between gap-3 px-4 py-3', className)}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cx(nav, 'hover:bg-slate-100 dark:hover:bg-slate-800')}
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {pageWindow(page, pages).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPage(n)}
                aria-current={n === page ? 'page' : undefined}
                aria-label={`Page ${n}`}
                className={cx(
                  nav,
                  n === page
                    ? 'bg-brand-800 font-semibold text-white dark:bg-accent dark:text-brand-950'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            className={cx(nav, 'hover:bg-slate-100 dark:hover:bg-slate-800')}
            onClick={() => onPage(page + 1)}
            disabled={page >= pages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
}

export function tabPanelProps(id) {
  return { role: 'tabpanel', id: `panel-${id}`, 'aria-labelledby': `tab-${id}`, tabIndex: 0 };
}

export function Tabs({ tabs, value, onChange, label = 'Sections', className }) {
  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === value);
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next !== null) {
      e.preventDefault();
      onChange(tabs[next].id);
      document.getElementById(`tab-${tabs[next].id}`)?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx(
        'inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800',
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`panel-${t.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-white text-brand-800 shadow-soft dark:bg-slate-950 dark:text-accent-light'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            {t.icon && <t.icon className="h-4 w-4" aria-hidden="true" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', label = 'Search', className }) {
  return (
    <div className={cx('relative', className)}>
      <label className="sr-only" htmlFor="search-input">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        id="search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input !pl-9 !pr-9"
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-brand-700 dark:bg-accent' : 'bg-slate-300 dark:bg-slate-700'
      )}
    >
      <span
        className={cx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform dark:data-[on=true]:bg-brand-950',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
        data-on={checked}
      />
    </button>
  );
}

export function ProgressBar({ value, label, tone = 'blue', className }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const color = { blue: 'bg-brand-600 dark:bg-accent', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800', className)}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---- Filters (search + dropdowns) used by ResourcePage and ReadOnlyCards ----
function FilterSelect({ filter, value, onChange }) {
  const spec =
    filter.options !== undefined
      ? { static: filter.options }
      : typeof filter.optionsSpec === 'function'
      ? filter.optionsSpec()
      : filter.optionsSpec || {};
  const { options, isLoading } = useOptions(spec);
  const allLabel = filter.allLabel || `All ${filter.label.toLowerCase()}`;

  return (
    <select
      aria-label={filter.label}
      className="input !w-auto min-w-[9rem]"
      value={value ?? ''}
      onChange={(e) => onChange(filter.name, e.target.value)}
    >
      <option value="">{isLoading ? 'Loading…' : allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FilterBar({
  searchable = true,
  search,
  onSearch,
  searchPlaceholder,
  filters = [],
  values = {},
  onChange,
}) {
  if (!searchable && filters.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {searchable && (
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder={searchPlaceholder}
          className="w-full sm:w-72"
        />
      )}
      {filters.map((f) =>
        f.type === 'text' ? (
          <input
            key={f.name}
            type="text"
            aria-label={f.label}
            placeholder={f.label}
            className="input !w-auto min-w-[9rem]"
            value={values[f.name] ?? ''}
            onChange={(e) => onChange(f.name, e.target.value)}
          />
        ) : (
          <FilterSelect key={f.name} filter={f} value={values[f.name]} onChange={onChange} />
        )
      )}
    </div>
  );
}
