import { useState, useCallback } from 'react';
import { getMailLogsGrouped, getMailStats } from '../api';
import { message } from 'antd';

export function useMailStats() {
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadMailData = useCallback(async () => {
    setLoading(true);
    try {
      const [g, s] = await Promise.all([getMailLogsGrouped(), getMailStats()]);
      setGroups(g);
      setStats(s);
    } catch (err) {
      message.error(err.response?.data?.error || err.message || 'Failed to load mail stats');
    } finally {
      setLoading(false);
    }
  }, []);

  return { groups, stats, loading, loadMailData };
}
