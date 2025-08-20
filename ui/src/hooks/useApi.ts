import { useState, useEffect, useCallback } from 'react';
import { apiClient, type Pathway, type PathwaysParams, type GseaParams } from '../lib/api';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useGsea() {
  const [state, setState] = useState<UseApiState<Pathway[]>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (params: GseaParams) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const response = await apiClient.runGsea(params);

    if (response.status === 'success') {
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
    } else {
      setState({
        data: null,
        loading: false,
        error: response.message || 'Failed to run GSEA analysis',
      });
    }
  }, []);

  return {
    ...state,
    execute,
  };
}

export function useGmtLibraries() {
  const [state, setState] = useState<UseApiState<string[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchLibraries = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const response = await apiClient.getGmtLibraries();

    if (response.status === 'success') {
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
    } else {
      setState({
        data: null,
        loading: false,
        error: response.message || 'Failed to fetch GMT libraries',
      });
    }
  }, []);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  return {
    ...state,
    refetch: fetchLibraries,
  };
}

export function usePathways(params: PathwaysParams) {
  const [state, setState] = useState<UseApiState<Pathway[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchPathways = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const response = await apiClient.getPathways(params);

    if (response.status === 'success') {
      setState({
        data: response.data,
        loading: false,
        error: null,
      });
    } else {
      setState({
        data: null,
        loading: false,
        error: response.message || 'Failed to fetch pathways',
      });
    }
  }, [params.diseaseId, params.library, params.fdr_lt, params.hide_leading_edge]);

  useEffect(() => {
    fetchPathways();
  }, [fetchPathways]);

  return {
    ...state,
    refetch: fetchPathways,
  };
} 