// Thin wrappers around TanStack Query v5.
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, errMsg } from '../api/client';

// useGet(key, url, params, opts) -> query result. `data` is the full body: { data, meta? }.
export function useGet(key, url, params, opts = {}) {
  const baseKey = Array.isArray(key) ? key : [key];
  return useQuery({
    queryKey: [...baseKey, params ?? {}],
    queryFn: () => api.get(url, params),
    ...opts,
  });
}

// useAction(mutationFn, { invalidate, success, onSuccess, onError, toastError })
// - invalidate: a key or array of keys (strings or arrays) to refetch afterwards
// - success: string or (result, vars) => string for a success toast
export function useAction(mutationFn, options = {}) {
  const { invalidate, success, onSuccess, onError, toastError = true } = options;
  const qc = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (result, vars, ctx) => {
      const keys = invalidate ? (Array.isArray(invalidate) ? invalidate : [invalidate]) : [];
      keys.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      if (success) toast.success(typeof success === 'function' ? success(result, vars) : success);
      onSuccess?.(result, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      if (toastError) toast.error(errMsg(err));
      onError?.(err, vars, ctx);
    },
  });
}

// useOptions(spec) -> { options: [{value,label}], isLoading, isError, refetch }
// spec: { endpoint, params, value='id', label='name', transform, static }
export function useOptions(spec = {}) {
  const { endpoint, params, value = 'id', label = 'name', transform, paged = true, static: staticOptions } = spec;
  const enabled = !staticOptions && !!endpoint;

  const query = useQuery({
    queryKey: ['options', endpoint, params ?? {}],
    queryFn: () => api.get(endpoint, paged ? { per_page: 100, ...(params || {}) } : params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo(() => {
    if (staticOptions) return staticOptions;
    const items = query.data?.data;
    if (!Array.isArray(items)) return [];
    if (transform) return transform(items);
    const getV = typeof value === 'function' ? value : (x) => x[value];
    const getL = typeof label === 'function' ? label : (x) => x[label];
    return items.map((x) => ({ value: getV(x), label: getL(x) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, staticOptions, transform, value, label]);

  return {
    options,
    isLoading: enabled && query.isLoading,
    isError: enabled && query.isError,
    refetch: query.refetch,
  };
}

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
