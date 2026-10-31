import { useState } from 'react';
import { BellOff, Check, CheckCheck, Megaphone, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAction, useGet } from '../hooks/useApi';
import { errMsg } from '../api/client';
import { batchOptions, myBatchOptions, ROLES } from '../utils/optionSpecs';
import { formatDateTime, timeAgo } from '../utils/format';
import { ROLE_LABEL } from '../layouts/nav';
import DynamicForm, { cleanValues } from '../components/DynamicForm';
import { ConfirmDialog, Modal } from '../components/Modal';
import {
  Badge,
  Button,
  Card,
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Pagination,
  cx,
} from '../components/ui';

export default function Notifications() {
  const { role } = useAuth();
  const canPost = role !== 'STUDENT';
  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const query = useGet('notifications', '/notifications', { page, per_page: 10 }, { placeholderData: (p) => p });
  const refresh = ['notifications', 'unread-count'];

  const markRead = useAction((id) => api.post(`/notifications/${id}/read`), { invalidate: refresh });
  const markAll = useAction(() => api.post('/notifications/read-all'), {
    invalidate: refresh,
    success: 'All notifications marked as read',
  });
  const remove = useAction((id) => api.del(`/notifications/${id}`), {
    invalidate: refresh,
    success: 'Notification deleted',
    onSuccess: () => setToDelete(null),
  });
  const create = useAction((payload) => api.post('/notifications', payload), {
    invalidate: refresh,
    success: 'Notification posted',
    toastError: false, // the form shows the errors
    onSuccess: () => setComposeOpen(false),
  });

  const fields = [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'message', label: 'Message', type: 'textarea', required: true, rows: 5 },
    ...(role === 'ADMIN'
      ? [
          { name: 'audience_role', label: 'Audience', type: 'select', options: ROLES, placeholder: 'Everyone', hint: 'Leave blank to notify everyone.' },
          { name: 'batch_id', label: 'Batch', type: 'select', optionsSpec: batchOptions, placeholder: 'All batches' },
        ]
      : [{ name: 'batch_id', label: 'Batch', type: 'select', required: true, optionsSpec: myBatchOptions, hint: 'Only students in this batch are notified.' }]),
    { name: 'expires_at', label: 'Expires at', type: 'datetime-local', hint: 'Optional' },
  ];

  const items = query.data?.data || [];
  const hasUnread = items.some((n) => !n.is_read);

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Announcements and updates from your institute."
        actions={
          <>
            <Button
              variant="secondary"
              icon={CheckCheck}
              onClick={() => markAll.mutate()}
              loading={markAll.isPending}
              disabled={!hasUnread}
            >
              Mark all as read
            </Button>
            {canPost && (
              <Button icon={Plus} onClick={() => setComposeOpen(true)}>
                New notification
              </Button>
            )}
          </>
        }
      />

      {query.isLoading ? (
        <CardGridSkeleton count={4} className="!grid-cols-1 xl:!grid-cols-1" />
      ) : query.isError ? (
        <Card>
          <ErrorState message={errMsg(query.error)} onRetry={() => query.refetch()} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={BellOff} title="No notifications yet" message="New announcements will show up here." />
        </Card>
      ) : (
        <>
          <ul className={cx('space-y-3', query.isFetching && 'opacity-60')} aria-busy={query.isFetching}>
            {items.map((n) => (
              <li key={n.id}>
                <Card
                  className={cx(
                    'flex items-start gap-4',
                    !n.is_read && 'border-brand-300 bg-brand-50/50 dark:border-accent/40 dark:bg-slate-900'
                  )}
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-accent-light">
                    <Megaphone className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{n.title}</h2>
                      {!n.is_read && <Badge tone="amber">Unread</Badge>}
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-600 dark:text-slate-300">
                      {n.message}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span title={formatDateTime(n.created_at)}>{timeAgo(n.created_at)}</span>
                      <Badge tone="blue">{n.audience_role ? ROLE_LABEL[n.audience_role] || n.audience_role : 'Everyone'}</Badge>
                      {n.batch_name && <Badge tone="gray">{n.batch_name}</Badge>}
                      {n.expires_at && <span>Expires {formatDateTime(n.expires_at)}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.is_read && (
                      <IconButton
                        icon={Check}
                        label={`Mark "${n.title}" as read`}
                        disabled={markRead.isPending}
                        onClick={() => markRead.mutate(n.id)}
                      />
                    )}
                    {n.can_delete && (
                      <IconButton icon={Trash2} tone="danger" label={`Delete "${n.title}"`} onClick={() => setToDelete(n)} />
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Card flush className="mt-4">
            <Pagination meta={query.data?.meta} onPage={setPage} />
          </Card>
        </>
      )}

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New notification" size="md">
        {composeOpen && (
          <DynamicForm
            fields={fields}
            onSubmit={(vals) => create.mutateAsync(cleanValues(fields, vals))}
            onCancel={() => setComposeOpen(false)}
            submitLabel="Post"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Delete notification?"
        message={toDelete ? `"${toDelete.title}" will be removed for everyone it was sent to.` : ''}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
