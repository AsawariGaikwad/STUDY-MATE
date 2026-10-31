import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button, cx } from './ui';

// Shared scroll lock (works with stacked dialogs)
let lockCount = 0;
function lockScroll() {
  if (lockCount++ === 0) document.body.style.overflow = 'hidden';
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = '';
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

function ModalInner({ onClose, title, description, size, footer, children, role, dismissible }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    lockScroll();
    const previous = document.activeElement;
    const panel = panelRef.current;
    // Focus the first form control if there is one, otherwise the panel.
    const firstField = panel?.querySelector('input:not([type=hidden]),select,textarea');
    (firstField || panel)?.focus();
    return () => {
      unlockScroll();
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation(); // portals bubble through React parents
      if (dismissible) onClose?.();
      return;
    }
    if (e.key === 'Tab') {
      const nodes = panelRef.current?.querySelectorAll(FOCUSABLE);
      if (!nodes || nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.15 }}
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onMouseDown={() => dismissible && onClose?.()}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={reduce ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-lift outline-none dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl',
          SIZES[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  role = 'dialog',
  dismissible = true,
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <ModalInner
          onClose={onClose}
          title={title}
          description={description}
          size={size}
          footer={footer}
          role={role}
          dismissible={dismissible}
        >
          {children}
        </ModalInner>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      role="alertdialog"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      {children}
    </Modal>
  );
}
