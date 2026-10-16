import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';

/** GET `url` on mount (and when it changes). Returns { data, error, loading, reload }. */
export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data } = await api.get(url);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState({ data: null, error: errMsg(e), loading: false });
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
