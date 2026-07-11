import { useState, useCallback } from 'react';
import { getCompanyRecruiters } from '../api';
import { message } from 'antd';

export function useRecruiters(companyId) {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRecruiters = useCallback(async (filters = {}) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = {
        name: filters.name || undefined,
        status: filters.status,
        lastPostedFrom: filters.lastPosted?.[0] ? filters.lastPosted[0].format('YYYY-MM-DD') : undefined,
        lastPostedTo: filters.lastPosted?.[1] ? filters.lastPosted[1].format('YYYY-MM-DD') : undefined
      };
      const data = await getCompanyRecruiters(companyId, params);
      setRecruiters(data);
    } catch (err) {
      message.error(err.response?.data?.error || err.message || 'Failed to load recruiters');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  return { recruiters, loading, loadRecruiters };
}
