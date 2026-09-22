import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../api/session';
import { listOwnedLinks, type LinkPage } from './api';

export function useOwnedLinks(page = 1, pageSize = 20) {
  const [data, setData] = useState<LinkPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const load = useCallback(async () => {
    const attempt = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const links = await listOwnedLinks(page, pageSize);
      if (attempt === generation.current) setData(links);
    } catch (failure) {
      if (attempt === generation.current)
        setError(
          failure instanceof ApiClientError
            ? failure.message
            : 'Your links could not be loaded. Please try again.',
        );
    } finally {
      if (attempt === generation.current) setLoading(false);
    }
  }, [page, pageSize]);
  useEffect(() => {
    const pending = Promise.resolve().then(load);
    void pending;
    return () => {
      generation.current += 1;
    };
  }, [load]);
  return { data, loading, error, reload: load };
}
