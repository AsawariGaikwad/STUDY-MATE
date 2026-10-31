// Config-driven forms: React Hook Form + Zod.
//
// field = {
//   name: 'email' | 'student.class_level'   (dotted names become nested payload keys)
//   label, type, required, placeholder, hint, full,
//   options: [{value,label}]                (static UI enums only)
//   optionsSpec: spec | (values)=>spec      (API-driven; see utils/optionSpecs.js)
//   as: 'number' | 'string'                 (cast select values; ids default to number)
//   min, max, step, minLength, maxLength, pattern, patternMessage, integer,
//   accept: '.pdf,.png', maxSize: bytes     (file)
//   hidden: bool | (values)=>bool, disabled, createOnly, omitEmpty, validate: (value, values)=>string|true
// }
// `fields` may be an array or a function (values) => array for dependent forms.
import { useId, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { errDetails, errMsg, flattenDetails } from '../api/client';
import { useOptions } from '../hooks/useApi';
import { toISO, toLocalInput } from '../utils/format';
import { Button, Field, Skeleton, cx } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WIDE_TYPES = ['textarea', 'multiselect', 'file'];

// ---------- path helpers ----------
export function getIn(obj, path) {
  return path.split('.').reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);
}

function setIn(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((k) => {
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = value;
  return obj;
}

const isHidden = (f, values) => (typeof f.hidden === 'function' ? f.hidden(values) : !!f.hidden);

function listFields(fields, values) {
  return (typeof fields === 'function' ? fields(values) : fields) || [];
}

function visibleFields(fields, values) {
  return listFields(fields, values).filter((f) => !isHidden(f, values));
}

// ---------- value helpers (exported) ----------
function emptyValue(f) {
  if (f.type === 'multiselect') return [];
  if (f.type === 'checkbox') return false;
  return '';
}

export function defaultsOf(fields, values = {}) {
  const out = {};
  listFields(fields, values).forEach((f) => {
    if (f.type === 'file') return;
    setIn(out, f.name, f.defaultValue !== undefined ? f.defaultValue : emptyValue(f));
  });
  return out;
}

// API record -> form (string) values
export function toFormValues(fields, record = {}) {
  const list = listFields(fields, record);
  const out = defaultsOf(list);
  list.forEach((f) => {
    if (f.type === 'file' || f.type === 'password') return;
    const raw = getIn(record, f.name);
    let v;
    if (f.type === 'checkbox') v = Boolean(raw);
    else if (f.type === 'multiselect') v = Array.isArray(raw) ? raw.map(String) : [];
    else if (f.type === 'datetime-local') v = toLocalInput(raw);
    else if (f.type === 'date') v = raw ? String(raw).slice(0, 10) : '';
    else v = raw === null || raw === undefined ? '' : String(raw);
    setIn(out, f.name, v);
  });
  return out;
}

function castSelect(f, v) {
  if (f.as === 'string') return String(v);
  if (f.as === 'number' || (f.optionsSpec && /^-?\d+$/.test(String(v)))) return Number(v);
  return v;
}

// Form values -> API payload. mode "edit" sends null for cleared optional
// fields; mode "create" simply leaves them out.
export function cleanValues(fields, values, { mode = 'create' } = {}) {
  const out = {};
  visibleFields(fields, values).forEach((f) => {
    if (f.disabled) return; // locked fields are never sent
    const v = getIn(values, f.name);
    if (f.type === 'file') {
      const file = v && v[0];
      if (file) setIn(out, f.name, file);
      return;
    }
    if (f.type === 'checkbox') return setIn(out, f.name, Boolean(v));
    if (f.type === 'multiselect') return setIn(out, f.name, (v || []).map((x) => castSelect(f, x)));

    const s = typeof v === 'string' ? v.trim() : v;
    if (s === '' || s === null || s === undefined) {
      if (!f.omitEmpty && mode === 'edit') setIn(out, f.name, null);
      return;
    }
    if (f.type === 'number' || f.as === 'number') return setIn(out, f.name, Number(s));
    if (f.type === 'datetime-local') return setIn(out, f.name, toISO(s));
    if (f.type === 'select') return setIn(out, f.name, castSelect(f, s));
    if (f.type === 'password') return setIn(out, f.name, v); // never trim passwords
    setIn(out, f.name, s);
  });
  return out;
}

// ---------- validation ----------
function isEmptyValue(f, v) {
  if (f.type === 'multiselect') return !v || v.length === 0;
  if (f.type === 'file') return !v || v.length === 0;
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function validateField(f, v, values) {
  const label = f.label || f.name;
  if (f.type === 'checkbox') return f.required && !v ? `${label} must be accepted` : null;
  if (isEmptyValue(f, v)) return f.required ? `${label} is required` : null;

  switch (f.type) {
    case 'email':
      if (!EMAIL_RE.test(String(v).trim())) return 'Enter a valid email address';
      break;
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) return 'Enter a valid number';
      if (f.integer && !Number.isInteger(n)) return 'Enter a whole number';
      if (f.min !== undefined && n < Number(f.min)) return `Must be at least ${f.min}`;
      if (f.max !== undefined && n > Number(f.max)) return `Must be at most ${f.max}`;
      break;
    }
    case 'date':
      if (!DATE_RE.test(String(v)) || Number.isNaN(new Date(v).getTime())) return 'Enter a valid date';
      if (f.min && v < f.min) return 'Date is too early';
      if (f.max && v > f.max) return 'Date cannot be in the future';
      break;
    case 'datetime-local':
      if (Number.isNaN(new Date(v).getTime())) return 'Enter a valid date and time';
      break;
    case 'file': {
      const file = v[0];
      if (f.maxSize && file.size > f.maxSize) {
        return `File is too large (max ${Math.round(f.maxSize / (1024 * 1024))} MB)`;
      }
      if (f.accept) {
        const allowed = f.accept.split(',').map((x) => x.trim().toLowerCase());
        const ext = `.${file.name.split('.').pop().toLowerCase()}`;
        if (!allowed.includes(ext)) return `Allowed file types: ${allowed.join(', ')}`;
      }
      break;
    }
    default:
      break;
  }

  if (typeof v === 'string') {
    if (f.minLength && v.length < f.minLength) return `Must be at least ${f.minLength} characters`;
    if (f.maxLength && v.length > f.maxLength) return `Must be at most ${f.maxLength} characters`;
    if (f.pattern && !f.pattern.test(v)) return f.patternMessage || 'Invalid format';
  }
  if (f.validate) {
    const res = f.validate(v, values);
    if (typeof res === 'string') return res;
  }
  return null;
}

// Zod resolver that rebuilds its rules from the currently visible fields.
function buildResolver(getFields) {
  return (values, context, options) => {
    const fields = getFields(values);
    const schema = z
      .object({})
      .passthrough()
      .superRefine((val, ctx) => {
        fields.forEach((f) => {
          const msg = validateField(f, getIn(val, f.name), val);
          if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, path: f.name.split('.'), message: msg });
        });
      });
    return zodResolver(schema)(values, context, options);
  };
}

// ---------- field renderer ----------
function FieldInput({ field: f, uid, form, values }) {
  const { register, control, formState } = form;
  const [show, setShow] = useState(false);
  const id = `${uid}-${f.name.replace(/\./g, '-')}`;
  const error = getIn(formState.errors, f.name)?.message;

  const spec =
    f.options !== undefined
      ? { static: f.options }
      : typeof f.optionsSpec === 'function'
      ? f.optionsSpec(values)
      : f.optionsSpec || {};
  const { options, isLoading, isError, refetch } = useOptions(spec);

  const aria = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : f.hint ? `${id}-hint` : undefined,
    disabled: f.disabled,
  };
  const wrap = cx(f.full || WIDE_TYPES.includes(f.type) ? 'sm:col-span-2' : '');

  if (f.type === 'checkbox') {
    return (
      <div className={wrap}>
        <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            {...aria}
            {...register(f.name)}
          />
          <span>{f.label}</span>
        </label>
        {f.hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.hint}</p>}
        {error && (
          <p id={`${id}-error`} role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (f.type === 'multiselect') {
    return (
      <Controller
        name={f.name}
        control={control}
        render={({ field }) => {
          const selected = Array.isArray(field.value) ? field.value : [];
          const toggle = (val) => {
            const s = String(val);
            field.onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
          };
          return (
            <fieldset className={wrap} aria-describedby={error ? `${id}-error` : undefined}>
              <legend className="label">
                {f.label}
                {f.required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
              </legend>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-300 p-2 dark:border-slate-700">
                {isLoading ? (
                  <div className="space-y-2 p-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : isError ? (
                  <p className="p-1 text-sm text-red-600 dark:text-red-400">
                    Could not load options.{' '}
                    <button type="button" className="font-medium underline" onClick={() => refetch()}>
                      Retry
                    </button>
                  </p>
                ) : options.length === 0 ? (
                  <p className="p-1 text-sm text-slate-500">No options available.</p>
                ) : (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {options.map((o) => (
                      <label
                        key={o.value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                          checked={selected.includes(String(o.value))}
                          onChange={() => toggle(o.value)}
                          disabled={f.disabled}
                        />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {f.hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.hint}</p>}
              {error && (
                <p id={`${id}-error`} role="alert" className="field-error">
                  {error}
                </p>
              )}
            </fieldset>
          );
        }}
      />
    );
  }

  let control_;
  if (f.type === 'select') {
    control_ = (
      <Controller
        name={f.name}
        control={control}
        render={({ field }) => (
          <>
            <select
              {...aria}
              className="input"
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
            >
              <option value="">{isLoading ? 'Loading…' : f.placeholder || 'Select…'}</option>
              {options.map((o) => (
                <option key={o.value} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
            {isError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Could not load options.{' '}
                <button type="button" className="font-medium underline" onClick={() => refetch()}>
                  Retry
                </button>
              </p>
            )}
          </>
        )}
      />
    );
  } else if (f.type === 'textarea') {
    control_ = (
      <textarea
        rows={f.rows || 4}
        className="input"
        placeholder={f.placeholder}
        maxLength={f.maxLength}
        {...aria}
        {...register(f.name)}
      />
    );
  } else if (f.type === 'file') {
    control_ = (
      <input
        type="file"
        accept={f.accept}
        className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-800 dark:file:bg-brand-900 dark:file:text-brand-100"
        {...aria}
        {...register(f.name)}
      />
    );
  } else if (f.type === 'password') {
    control_ = (
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input !pr-10"
          placeholder={f.placeholder}
          autoComplete="new-password"
          {...aria}
          {...register(f.name)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    );
  } else {
    control_ = (
      <input
        type={f.type || 'text'}
        className="input"
        placeholder={f.placeholder}
        min={f.min}
        max={f.max}
        step={f.type === 'number' ? f.step || 'any' : undefined}
        maxLength={f.maxLength}
        autoComplete={f.autoComplete || 'off'}
        {...aria}
        {...register(f.name)}
      />
    );
  }

  return (
    <Field label={f.label} htmlFor={id} error={error} hint={f.hint} required={f.required} className={wrap}>
      {control_}
    </Field>
  );
}

// ---------- the form ----------
export default function DynamicForm({
  fields,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  columns = 2,
  className,
  children,
}) {
  const uid = useId();
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const resolver = useMemo(() => buildResolver((vals) => visibleFields(fieldsRef.current, vals).filter((f) => !f.disabled)), []);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    defaultValues: defaultValues ?? defaultsOf(fields),
    resolver,
    shouldUnregister: true,
    mode: 'onTouched',
  });
  const { handleSubmit, watch, setError, formState } = form;
  const values = watch();
  const visible = visibleFields(fields, values);

  const showServerError = (err) => {
    const flat = flattenDetails(errDetails(err));
    const names = new Set(visibleFields(fieldsRef.current, form.getValues()).map((f) => f.name));
    const leftovers = [];
    let first = true;
    Object.entries(flat).forEach(([key, msg]) => {
      if (names.has(key)) {
        setError(key, { type: 'server', message: msg }, { shouldFocus: first });
        first = false;
      } else {
        leftovers.push(`${key.replace(/[._]/g, ' ')}: ${msg}`);
      }
    });
    const hasFieldErrors = Object.keys(flat).length > leftovers.length;
    if (!hasFieldErrors || leftovers.length) {
      setFormError([errMsg(err), ...leftovers].join(' '));
    }
  };

  const submit = handleSubmit(async (vals) => {
    setFormError(null);
    try {
      await onSubmit(vals, form);
    } catch (err) {
      showServerError(err);
    }
  });

  return (
    <form onSubmit={submit} noValidate className={className}>
      {formError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </div>
      )}
      <div className={cx('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>
        {visible.map((f) => (
          <FieldInput key={f.name} field={f} uid={uid} form={form} values={values} />
        ))}
      </div>
      {children}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={formState.isSubmitting}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" loading={formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
