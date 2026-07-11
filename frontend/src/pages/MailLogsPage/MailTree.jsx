import { Table } from 'antd';
import { Link } from 'react-router-dom';
import { MailStatusTag } from '../../components/StatusTag';
import { dateTime } from '../../utils/formatters';

/**
 * Innermost table: the individual mails of one recruiter.
 */
function MailsTable({ mails }) {
  const columns = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Subject', dataIndex: 'subject', ellipsis: true },
    { title: 'Resume', dataIndex: 'attachment', width: 180, render: a => a || '—' },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s, m) => <MailStatusTag status={s} error={m.error} /> },
    { title: 'Queued', dataIndex: 'created_on', width: 160, render: dateTime },
    { title: 'Sent', dataIndex: 'sent_on', width: 160, render: dateTime },
    { title: 'Opened', dataIndex: 'opened_on', width: 160, render: dateTime }
  ];
  return <Table rowKey="id" size="small" columns={columns} dataSource={mails} pagination={false} />;
}

/**
 * Middle table: recruiters of one company; expand to see their mails.
 */
function RecruitersTable({ recruiters }) {
  const columns = [
    { title: 'Recruiter', render: (_, r) => r.recname || `#${r.recruiter_id}` },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Mails', width: 90, render: (_, r) => r.mails.length },
    {
      title: 'Latest status', width: 130,
      render: (_, r) => <MailStatusTag status={r.mails[0].status} error={r.mails[0].error} />
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

/**
 * Outermost table: companies -> expand to recruiters -> expand to mails.
 */
export default function MailTree({ groups, loading, onRefresh }) {
  const columns = [
    {
      title: 'Company',
      render: (_, g) => <Link to={`/company/${g.company_id}`}>{g.organisation || `#${g.company_id}`}</Link>
    },
    { title: 'Recruiters mailed', width: 160, render: (_, g) => g.recruiters.length },
    { title: 'Mails', width: 100, dataIndex: 'total' }
  ];

  return (
    <Table
      rowKey="company_id"
      columns={columns}
      dataSource={groups}
      loading={loading}
      expandable={{ expandedRowRender: g => <RecruitersTable recruiters={g.recruiters} /> }}
      pagination={{ pageSize: 20, showTotal: t => `${t} companies mailed` }}
    />
  );
}
