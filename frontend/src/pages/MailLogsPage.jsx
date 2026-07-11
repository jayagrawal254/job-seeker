import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Collapse, Form, Input, Row, Select, Space, Statistic, Table, Tag, Tooltip, message
} from 'antd';
import { Link } from 'react-router-dom';
import { getMailLogsGrouped, getMailStats, getTemplates, sendTestMail } from '../api';
import ResumeSelect from './ResumeSelect.jsx';
import MailPreview from './MailPreview.jsx';

function KpiDashboard({ stats }) {
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

// Simple 7-day bar-ish breakdown table with inline mini bars.
function DailyBreakdown({ daily }) {
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

function TestMailPanel() {
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState([]);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState('Nikhil_Mittal_Resume.pdf');
  const subject = Form.useWatch('subject', form);
  const body = Form.useWatch('body', form);

  useEffect(() => { getTemplates().then(setTemplates).catch(() => {}); }, []);

  const applyTemplate = id => {
    const t = templates.find(t => t.id === id);
    if (t) form.setFieldsValue({ subject: t.subject, body: t.body });
  };

  const onSend = async () => {
    const v = await form.validateFields();
    setSending(true);
    try {
      const r = await sendTestMail({ ...v, attachment: attachment || null });
      message.success(r.dryRun ? '[DRY-RUN] logged (no SMTP configured)' : `Test email sent via ${r.via}`);
    } catch (err) {
      message.error(err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="to" label="Send test to" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="your.email@gmail.com" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Prefill from template">
            <Select
              placeholder="Pick a template (optional)"
              allowClear
              onChange={applyTemplate}
              options={templates.map(t => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
        <Input placeholder="{{recname}} / {{organisation}} are NOT replaced in a test — they send literally" />
      </Form.Item>
      <Form.Item name="body" label="Body (HTML)" rules={[{ required: true }]}>
        <Input.TextArea rows={6} />
      </Form.Item>
      <Form.Item label="Resume">
        <ResumeSelect value={attachment} onChange={setAttachment} />
      </Form.Item>
      <Button type="primary" loading={sending} onClick={onSend}>Send test email</Button>
      <div style={{ marginTop: 16 }}><MailPreview subject={subject} body={body} /></div>
    </Form>
  );
}

const STATUS_COLORS = {
  pending: 'gold', sent: 'blue', opened: 'green', bounced: 'red', failed: 'volcano'
};

const fmt = d => (d ? String(d).replace('T', ' ').slice(0, 19) : '—');

const statusTag = (s, error) => (
  <Tooltip title={error || undefined}><Tag color={STATUS_COLORS[s]}>{s}</Tag></Tooltip>
);

// Innermost table: the individual mails of one recruiter.
function MailsTable({ mails }) {
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Subject', dataIndex: 'subject', ellipsis: true },
    { title: 'Resume', dataIndex: 'attachment', width: 180, render: a => a || '—' },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s, m) => statusTag(s, m.error) },
    { title: 'Queued', dataIndex: 'created_on', width: 160, render: fmt },
    { title: 'Sent', dataIndex: 'sent_on', width: 160, render: fmt },
    { title: 'Opened', dataIndex: 'opened_on', width: 160, render: fmt }
  ];
  return <Table rowKey="id" size="small" columns={columns} dataSource={mails} pagination={false} />;
}

// Middle table: recruiters of one company; expand to see their mails.
function RecruitersTable({ recruiters }) {
  const columns = [
    { title: 'Recruiter', render: (_, r) => r.recname || `#${r.recruiter_id}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Mails', width: 90, render: (_, r) => r.mails.length },
    {
      title: 'Latest status', width: 130,
      render: (_, r) => statusTag(r.mails[0].status, r.mails[0].error)
    }
  ];
  return (
    <Table
      rowKey="recruiter_id"
      size="small"
      columns={columns}
      dataSource={recruiters}
      pagination={false}
      expandable={{ expandedRowRender: r => <MailsTable mails={r.mails} /> }}
    />
  );
}

export default function MailLogsPage() {
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, s] = await Promise.all([getMailLogsGrouped(), getMailStats()]);
      setGroups(g);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      title: 'Company',
      render: (_, g) => <Link to={`/company/${g.company_id}`}>{g.organisation || `#${g.company_id}`}</Link>
    },
    { title: 'Recruiters mailed', width: 160, render: (_, g) => g.recruiters.length },
    { title: 'Mails', width: 100, dataIndex: 'total' }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Collapse items={[{ key: 'test', label: '✉ Send a test email', children: <TestMailPanel /> }]} />
      <KpiDashboard stats={stats} />
      <DailyBreakdown daily={stats?.daily} />
      <Card
        title="Mails by company"
        extra={<Button onClick={load} loading={loading}>Refresh</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="company_id"
          columns={columns}
          dataSource={groups}
          loading={loading}
          expandable={{ expandedRowRender: g => <RecruitersTable recruiters={g.recruiters} /> }}
          pagination={{ pageSize: 20, showTotal: t => `${t} companies mailed` }}
        />
      </Card>
    </Space>
  );
}
