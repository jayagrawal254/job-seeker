import { useEffect } from 'react';
import { Button, Card, Collapse, Space } from 'antd';
import KpiDashboard from './KpiDashboard';
import DailyBreakdown from './DailyBreakdown';
import TestMailPanel from './TestMailPanel';
import MailTree from './MailTree';
import { useMailStats } from '../../hooks/useMailStats';

export default function MailLogsPage() {
  const { groups, stats, loading, loadMailData } = useMailStats();

  useEffect(() => { loadMailData(); }, [loadMailData]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Collapse items={[{ key: 'test', label: '✉ Send a test email', children: <TestMailPanel /> }]} />
      <KpiDashboard stats={stats} />
      <DailyBreakdown daily={stats?.daily} />
      <Card
        title="Mails by company"
        extra={<Button onClick={loadMailData} loading={loading}>Refresh</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <MailTree groups={groups} loading={loading} onRefresh={loadMailData} />
      </Card>
    </Space>
  );
}
