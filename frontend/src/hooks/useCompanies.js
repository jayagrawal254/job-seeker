import { useState, useCallback } from 'react';
import { getCompanies, searchCompanies } from '../api';
import { EMPTY_FILTERS } from '../constants';
import { message } from 'antd';

export function useCompanies() {
  const [data, setData] = useState({ companies: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);

  const loadCompanies = useCallback(async (page = 1, filters = EMPTY_FILTERS, sort = null) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        search: filters.search || undefined,
        status: filters.status,
        locations: filters.locations?.length ? filters.locations.join(',') : undefined,
        lastPostedFrom: filters.lastPosted?.[0] ? filters.lastPosted[0].format('YYYY-MM-DD') : undefined,
        lastPostedTo: filters.lastPosted?.[1] ? filters.lastPosted[1].format('YYYY-MM-DD') : undefined,
        minExp: filters.minExp,
        maxExp: filters.maxExp,
        minSal: filters.minSal,
        maxSal: filters.maxSal,
        sortBy: sort?.sortBy,
        sortDir: sort?.sortDir
      };
      const result = await getCompanies(params);
      setData(result);
    } catch (err) {
      message.error(err.response?.data?.error || err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAutocomplete = useCallback(async (term) => {
    if (!term || term.length < 2) return [];
    try {
      return await searchCompanies(term);
    } catch (err) {
      console.error('Autocomplete search failed:', err);
      return [];
    }
  }, []);

  return { data, loading, loadCompanies, searchAutocomplete };
}
