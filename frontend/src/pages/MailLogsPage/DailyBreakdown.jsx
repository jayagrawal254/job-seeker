import { Card, Table } from 'antd';

/**
 * Simple 7-day bar-ish breakdown table with inline mini bars.
 */
export default function DailyBreakdown({ daily }) {
  if (!daily?.length) return null;
  const max = Math.max(1, ...daily.map(d => Math.max(d.queued, d.sent, d.opened)));
  const bar = (n, color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ height: 10, width: `${(n / max) * 100}%`, minWidth: n ? 6 : 0, background: color, borderRadius: 3 }} />
      <span style={{ fontSize: 12, color: '#555' }}>{n}</span>
    </div>
  );
  const columns = [
    { title: 'Date', dataIndex: 'date', width: 120 },
    { title: 'Queued', dataIndex: 'queued', render: n => bar(n, '#c7d2fe') },
    { title: 'Sent', dataIndex: 'sent', render: n => bar(n, '#93c5fd') },
    { title: 'Opened', dataIndex: 'opened', render: n => bar(n, '#86efac') }
  ];
  return (
    <Card size="small" title="Last 7 days">
      <Table rowKey="date" size="small" columns={columns} dataSource={daily} pagination={false} />
    </Card>
  );
}
