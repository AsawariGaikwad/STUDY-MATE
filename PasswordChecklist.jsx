import { Check, Circle } from 'lucide-react';
import { checkPassword } from '../utils/password';
import { cx } from './ui';

export default function PasswordChecklist({ value = '', className }) {
  const rules = checkPassword(value);
  return (
    <ul className={cx('space-y-1.5', className)} aria-label="Password requirements">
      {rules.map((r) => (
        <li
          key={r.id}
          className={cx(
            'flex items-center gap-2 text-xs',
            r.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          {r.ok ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{r.label}</span>
          <span className="sr-only">{r.ok ? '(met)' : '(not met)'}</span>
        </li>
      ))}
    </ul>
  );
}
