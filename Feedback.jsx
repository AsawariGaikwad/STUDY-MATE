import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquareHeart, Send, Star } from 'lucide-react';
import { api, errDetails, errMsg, flattenDetails } from '../api/client';
import { useAction } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/format';
import ResourcePage from '../components/ResourcePage';
import { Button, Card, Field, PageHeader, Tabs, tabPanelProps, cx } from '../components/ui';

const schema = z.object({
  category: z.string().trim().min(1, 'Enter a category'),
  rating: z.number({ required_error: 'Choose a rating', invalid_type_error: 'Choose a rating' }).int().min(1, 'Choose a rating').max(5),
  message: z.string().trim().min(1, 'Write your feedback'),
});

function StarRating({ value, onChange, error }) {
  return (
    <fieldset aria-describedby={error ? 'rating-error' : undefined}>
      <legend className="label">
        Rating <span className="text-red-500" aria-hidden="true">*</span>
      </legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
            />
            <Star
              aria-hidden="true"
              className={cx(
                'h-9 w-9 rounded transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:peer-focus-visible:ring-accent-light',
                value && n <= value ? 'fill-accent text-accent' : 'text-slate-300 dark:text-slate-600'
              )}
            />
            <span className="sr-only">
              {n} out of 5
            </span>
          </label>
        ))}
        {value ? <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">{value} / 5</span> : null}
      </div>
      {error && (
        <p id="rating-error" role="alert" className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function FeedbackForm() {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { category: '', rating: undefined, message: '' },
  });

  const send = useAction((body) => api.post('/feedback', body), {
    invalidate: 'feedback',
    success: 'Thank you for your feedback!',
    toastError: false,
    onSuccess: () => reset({ category: '', rating: undefined, message: '' }),
  });

  const onSubmit = async (vals) => {
    try {
      await send.mutateAsync({ category: vals.category.trim(), rating: vals.rating, message: vals.message.trim() });
    } catch (err) {
      const flat = flattenDetails(errDetails(err));
      let matched = false;
      Object.entries(flat).forEach(([k, msg]) => {
        if (['category', 'rating', 'message'].includes(k)) {
          setError(k, { type: 'server', message: msg });
          matched = true;
        }
      });
      if (!matched) setError('message', { type: 'server', message: errMsg(err) });
    }
  };

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field
          label="Category"
          htmlFor="category"
          required
          error={errors.category?.message}
          hint="A short topic such as Teaching, Study material or this app."
        >
          <input
            id="category"
            className="input"
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? 'category-error' : 'category-hint'}
            {...register('category')}
          />
        </Field>

        <Controller
          name="rating"
          control={control}
          render={({ field }) => <StarRating value={field.value} onChange={field.onChange} error={errors.rating?.message} />}
        />

        <Field label="Your feedback" htmlFor="message" required error={errors.message?.message}>
          <textarea
            id="message"
            rows={5}
            className="input"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? 'message-error' : undefined}
            {...register('message')}
          />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" icon={Send} loading={send.isPending}>
            Send feedback
          </Button>
        </div>
      </form>
    </Card>
  );
}

// Admin: everything members have submitted.
function FeedbackList() {
  return (
    <ResourcePage
      title="All feedback"
      noun="Feedback"
      endpoint="/feedback"
      queryKey="feedback"
      searchable={false}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      emptyIcon={MessageSquareHeart}
      emptyTitle="No feedback yet"
      emptyMessage="Feedback sent by students and faculty will appear here."
      columns={[
        { key: 'created_at', header: 'Date', render: (r) => formatDateTime(r.created_at), className: 'whitespace-nowrap' },
        { key: 'from', header: 'From', render: (r) => r.full_name || r.user_name || r.username || '—' },
        { key: 'category', header: 'Category' },
        {
          key: 'rating',
          header: 'Rating',
          render: (r) => (
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />
              {r.rating}/5
            </span>
          ),
        },
        { key: 'message', header: 'Message', className: 'min-w-[16rem] whitespace-pre-line break-words' },
      ]}
    />
  );
}

export default function Feedback() {
  const { role } = useAuth();
  const [tab, setTab] = useState('list');

  if (role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Feedback" subtitle="Tell us what is working and what could be better." />
        <FeedbackForm />
      </div>
    );
  }

  return (
    <div>
      <Tabs
        tabs={[
          { id: 'list', label: 'All feedback' },
          { id: 'send', label: 'Send feedback' },
        ]}
        value={tab}
        onChange={setTab}
        label="Feedback"
        className="mb-6"
      />
      <div {...tabPanelProps(tab)} className="outline-none">
        {tab === 'list' ? (
          <FeedbackList />
        ) : (
          <>
            <PageHeader title="Send feedback" subtitle="Tell us what is working and what could be better." />
            <FeedbackForm />
          </>
        )}
      </div>
    </div>
  );
}
