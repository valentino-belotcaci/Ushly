import { useCallback, useEffect, useState } from 'react';
import { ApiClientError } from '../../api/session';
import { listOwnedLinks, type LinkPage } from './api';

export function useOwnedLinks(page = 1, pageSize = 20) {
  const [data, setData] = useState<LinkPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await listOwnedLinks(page, pageSize));
    } catch (failure) {
      setError(
        failure instanceof ApiClientError
          ? failure.message
          : 'Your links could not be loaded. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);
  useEffect(() => {
    const pending = Promise.resolve().then(load);
    void pending;
  }, [load]);
  return { data, loading, error, reload: load };
}
