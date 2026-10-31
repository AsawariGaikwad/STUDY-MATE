import { useEffect, useState } from 'react';
import { initials } from '../utils/format';
import { cx } from './ui';

// `version` is appended as ?t= so a freshly uploaded photo bypasses the cache.
export default function Avatar({ name, src, size = 40, version, className }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src, version]);

  const url =
    src && !failed ? (version ? `${src}${src.includes('?') ? '&' : '?'}t=${version}` : src) : null;

  return (
    <span
      className={cx(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-brand-800 font-heading font-semibold text-white',
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
    >
      {url ? (
        <img
          src={url}
          alt={name ? `Photo of ${name}` : 'Profile photo'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
