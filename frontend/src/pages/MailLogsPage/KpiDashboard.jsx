import { Card, Col, Row, Statistic } from 'antd';

/**
 * KPI dashboard showing mail statistics in a grid of stat cards.
 */
export default function KpiDashboard({ stats }) {
  if (!stats) return null;
  const bs = stats.byStatus || {};
  const kpis = [
    { title: 'Total queued', value: stats.total, color: '#111827' },
    { title: 'Sent today', value: stats.sentToday, color: '#2563eb' },
    { title: 'Sent last 7 days', value: stats.sentLast7, color: '#2563eb' },
    { title: 'Delivered', value: stats.delivered, color: '#16a34a' },
    { title: 'Opened', value: stats.opened, suffix: `(${stats.openRate}%)`, color: '#15803d' },
    { title: 'Pending', value: bs.pending || 0, color: '#b45309' },
    { title: 'Bounced', value: bs.bounced || 0, suffix: `(${stats.bounceRate}%)`, color: '#dc2626' },
    { title: 'Failed', value: bs.failed || 0, color: '#b91c1c' }
  ];
  return (
    <Row gutter={[16, 16]}>
      {kpis.map(k => (
        <Col key={k.title} xs={12} sm={8} md={6} lg={3}>
          <Card size="small">
            <Statistic title={k.title} value={k.value} suffix={k.suffix}
              valueStyle={{ color: k.color, fontSize: 22 }} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
