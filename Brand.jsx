import { GraduationCap } from 'lucide-react';
import { cx } from './ui';

export default function Brand({ collapsed = false, onDark = false, className }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-900 text-accent-light shadow-soft ring-1 ring-white/20">
        <GraduationCap className="h-6 w-6" aria-hidden="true" />
      </span>
      {!collapsed && (
        <span className="min-w-0 leading-tight">
          <span
            className={cx(
              'block truncate font-heading text-base font-semibold',
              onDark ? 'text-white' : 'text-brand-900 dark:text-white'
            )}
          >
            StudyMate
          </span>
          <span
            className={cx(
              'block truncate text-xs',
              onDark ? 'text-brand-200' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            of Moungiri
          </span>
        </span>
      )}
    </div>
  );
}
