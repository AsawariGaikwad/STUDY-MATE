// Config-driven CRUD page: search, filters, pagination, create/edit modal,
// delete confirm, custom row actions and multipart upload.
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAction, useDebounce, useGet } from '../hooks/useApi';
import { errMsg } from '../api/client';
import DataTable from './DataTable';
import DynamicForm, { cleanValues, defaultsOf, toFormValues } from './DynamicForm';
import { ConfirmDialog, Modal } from './Modal';
import { Button, FilterBar, IconButton, PageHeader } from './ui';

function toFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (v instanceof File) fd.append(k, v);
    else if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x)));
    else if (typeof v === 'object') fd.append(k, JSON.stringify(v));
    else fd.append(k, String(v));
  });
  return fd;
}

const flag = (v, row) => (typeof v === 'function' ? v(row) : v !== false);

export default function ResourcePage({
  title,
  subtitle,
  noun = 'Item',
  endpoint,
  createEndpoint,
  queryKey,
  columns,
  fields,
  filters = [],
  searchable = true,
  searchPlaceholder = 'Search…',
  perPage = 10,
  params,
  createLabel,
  itemName = (row) => row.name || row.title || `#${row.id}`,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  rowActions = [],
  upload = false,
  modalSize = 'md',
  formDefaults,
  onSaved,
  beforeSubmit,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  headerExtra,
}) {
  const key = queryKey || endpoint;
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [filterVals, setFilterVals] = useState({});
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', row? }
  const [toDelete, setToDelete] = useState(null);

  const filterKey = JSON.stringify(filterVals);
  useEffect(() => setPage(1), [dq, filterKey]);

  const query = useGet(
    key,
    endpoint,
    { page, per_page: perPage, q: dq, ...filterVals, ...(params || {}) },
    { placeholderData: (prev) => prev }
  );

  const save = useAction(
    ({ payload, mode, row }) => {
      const body = upload && mode === 'create' ? toFormData(payload) : payload;
      return mode === 'create' ? api.post(createEndpoint || endpoint, body) : api.patch(`${endpoint}/${row.id}`, body);
    },
    {
      invalidate: [key, 'options'],
      success: (_r, v) => `${noun} ${v.mode === 'create' ? 'added' : 'updated'}`,
      toastError: false, // the form shows field errors itself
      onSuccess: (res, vars) => {
        setModal(null);
        onSaved?.(res, vars);
      },
    }
  );

  const remove = useAction((row) => api.del(`${endpoint}/${row.id}`), {
    invalidate: [key, 'options'],
    success: `${noun} deleted`,
    onSuccess: () => setToDelete(null),
  });

  const mode = modal?.mode;
  const formFields = useMemo(
    () => (vals) =>
      ((typeof fields === 'function' ? fields(vals) : fields) || [])
        .filter((f) => !(mode === 'edit' && f.createOnly))
        .map((f) => (mode === 'edit' && f.lockOnEdit ? { ...f, disabled: true } : f)),
    [fields, mode]
  );

  const initial = useMemo(() => {
    if (!modal) return undefined;
    if (modal.mode === 'edit') return toFormValues(formFields, modal.row);
    return { ...defaultsOf(formFields), ...(formDefaults || {}) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const onSubmit = (vals) => {
    let payload = cleanValues(formFields, vals, { mode: modal.mode });
    if (beforeSubmit) payload = beforeSubmit(payload, { mode: modal.mode, row: modal.row });
    return save.mutateAsync({ payload, mode: modal.mode, row: modal.row });
  };

  const hasActions = canEdit !== false || canDelete !== false || rowActions.length > 0;
  const cols = hasActions
    ? [
        ...columns,
        {
          key: '_actions',
          header: <span className="sr-only">Actions</span>,
          className: 'w-px whitespace-nowrap text-right',
          render: (row) => (
            <div className="flex justify-end gap-1">
              {rowActions
                .filter((a) => !a.show || a.show(row))
                .map((a) => {
                  const label = typeof a.label === 'function' ? a.label(row) : a.label;
                  return <IconButton key={a.id || label} icon={a.icon} label={label} onClick={() => a.onClick(row)} />;
                })}
              {flag(canEdit, row) && (
                <IconButton icon={Pencil} label={`Edit ${itemName(row)}`} onClick={() => setModal({ mode: 'edit', row })} />
              )}
              {flag(canDelete, row) && (
                <IconButton icon={Trash2} tone="danger" label={`Delete ${itemName(row)}`} onClick={() => setToDelete(row)} />
              )}
            </div>
          ),
        },
      ]
    : columns;

  const filtered = Boolean(dq) || Object.values(filterVals).some(Boolean);
  const createButton =
    canCreate !== false ? (
      <Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>
        {createLabel || `Add ${noun.toLowerCase()}`}
      </Button>
    ) : null;

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {headerExtra}
            {createButton}
          </>
        }
      />

      <FilterBar
        searchable={searchable}
        search={q}
        onSearch={setQ}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        values={filterVals}
        onChange={(name, value) => setFilterVals((f) => ({ ...f, [name]: value }))}
      />

      <DataTable
        columns={cols}
        rows={query.data?.data || []}
        loading={query.isLoading}
        fetching={query.isFetching && !query.isLoading}
        error={query.isError ? errMsg(query.error) : null}
        onRetry={() => query.refetch()}
        meta={query.data?.meta}
        onPage={setPage}
        caption={title}
        emptyIcon={emptyIcon}
        emptyTitle={filtered ? 'No matching results' : emptyTitle || `No ${noun.toLowerCase()}s yet`}
        emptyMessage={
          filtered ? 'Try a different search or clear the filters.' : emptyMessage
        }
        emptyAction={!filtered ? createButton : undefined}
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        size={modalSize}
        title={mode === 'edit' ? `Edit ${noun.toLowerCase()}` : createLabel || `Add ${noun.toLowerCase()}`}
      >
        {modal && (
          <DynamicForm
            key={`${modal.mode}-${modal.row?.id ?? 'new'}`}
            fields={formFields}
            defaultValues={initial}
            onSubmit={onSubmit}
            onCancel={() => setModal(null)}
            submitLabel={modal.mode === 'edit' ? 'Save changes' : upload ? 'Upload' : 'Create'}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`Delete ${noun.toLowerCase()}?`}
        message={toDelete ? `"${itemName(toDelete)}" will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
