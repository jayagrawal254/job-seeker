import { useEffect, useState } from 'react';
import {
  Button, Card, Col, DatePicker, Descriptions, Input, Row, Select, Space, Statistic, Table, Tag, message
} from 'antd';
import { useParams, Link } from 'react-router-dom';
import { getCompany, mailCompanyActive, mailRecruiters } from '../../api';
import ComposeMailModal from '../../components/ComposeMailModal.jsx';
import { ActivityStatusTag } from '../../components/StatusTag';
import LocationTags from '../../components/LocationTags';
import { dateOnly } from '../../utils/formatters';
import { useRecruiters } from '../../hooks/useRecruiters';

const fmtDate = d => dateOnly(d) || '—';

export default function CompanyPage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [nameSearch, setNameSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('1');
  const [lastPosted, setLastPosted] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mailMode, setMailMode] = useState(null);

  const { recruiters, loading, loadRecruiters } = useRecruiters(companyId);

  useEffect(() => {
    getCompany(companyId).then(setCompany).catch(() => message.error('company not found'));
    loadRecruiters({ name: '', status: '1', lastPosted: null });
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const byStr = key => (a, b) => String(a[key] || '').localeCompare(String(b[key] || ''));
  const byNum = key => (a, b) => (a[key] || 0) - (b[key] || 0);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 90, sorter: byNum('id') },
    { title: 'Name', dataIndex: 'recname', sorter: byStr('recname') },
    { title: 'Email', dataIndex: 'email', sorter: byStr('email') },
    { title: 'Designation', dataIndex: 'designation', sorter: byStr('designation') },
    {
      title: 'Status', dataIndex: 'status', width: 100, sorter: byNum('status'),
      render: s => <ActivityStatusTag status={s} />
    },
    {
      title: 'Last job posted', dataIndex: 'last_job_posted_date', width: 150,
      sorter: byStr('last_job_posted_date'), render: fmtDate
    },
    {
      title: 'Mailed', dataIndex: 'last_mailed_date', width: 130, sorter: byStr('last_mailed_date'),
      render: (d, r) => (r.mailed_count > 0
        ? <Tag color="purple">{String(d).replace('T', ' ').slice(0, 10)}{r.mailed_count > 1 ? ` ×${r.mailed_count}` : ''}</Tag>
        : <span style={{ color: '#bbb' }}>—</span>)
    },
    {
      title: 'Registered', dataIndex: 'date_created', width: 150,
      sorter: byStr('date_created'), render: fmtDate
    },
    { title: 'Job locations', render: (_, r) => <LocationTags csv={r.location_ids} /> }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Link to="/">← Back to companies</Link>

      {company && (
        <Card title={company.organisation || company.company_name || `Company #${company.company_id}`}>
          <Row gutter={[24, 16]}>
            <Col xs={24} md={16}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Company ID">{company.company_id}</Descriptions.Item>
                <Descriptions.Item label="Domain">{company.domain || '—'}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <ActivityStatusTag status={company.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Last job posted">
                  {fmtDate(company.last_job_posted_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Experience">
                  {company.min !== null && company.max !== null ? `${company.min}–${company.max} yrs` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Salary">
                  {company.minsal !== null && company.maxsal !== null
                    ? `${company.minsal}–${company.maxsal}` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Locations" span={2}>
                  <LocationTags csv={company.company_location_ids} />
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={12} md={4}><Statistic title="Recruiters" value={company.recruiter_count} /></Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Active recruiters"
                value={company.active_recruiter_count ?? 0}
                suffix={`/ ${company.recruiter_count}`}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card
        title="Recruiters"
        extra={
          <Space>
            <Button
              type="primary"
              disabled={!recruiters.some(r => r.status === 1)}
              onClick={() => setMailMode('active')}
            >
              Mail all active recruiters
            </Button>
            <Button
              disabled={!selectedIds.length}
              onClick={() => setMailMode('selected')}
            >
              Mail selected ({selectedIds.length})
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search recruiter by name / email"
            allowClear
            style={{ width: 280 }}
            value={nameSearch}
            onChange={e => setNameSearch(e.target.value)}
            onSearch={v => loadRecruiters({ name: v })}
          />
          <Select
            style={{ width: 180 }}
            value={statusFilter}
            onChange={v => { setStatusFilter(v); loadRecruiters({ status: v }); }}
            options={[
              { value: '1', label: 'Active (posted jobs)' },
              { value: '0', label: 'Inactive' },
              { value: 'all', label: 'All recruiters' }
            ]}
          />
          <DatePicker.RangePicker
            placeholder={['Last job posted from', 'to']}
            value={lastPosted}
            onChange={v => { setLastPosted(v); loadRecruiters({ lastPosted: v }); }}
          />
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={recruiters}
          loading={loading}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: setSelectedIds
          }}
          pagination={{ pageSize: 20, showTotal: t => `${t} recruiters` }}
        />
      </Card>

      <ComposeMailModal
        open={mailMode !== null}
        title={mailMode === 'active'
          ? `Mail all active recruiters of ${company?.organisation || company?.domain || 'company'}`
          : `Mail ${selectedIds.length} selected recruiter(s)`}
        recipientHint={mailMode === 'active'
          ? 'Will be sent to every recruiter of this company with status Active (posted a job in the window).'
          : `Will be sent to the ${selectedIds.length} recruiter(s) you selected in the table.`}
        onSend={values => mailMode === 'active'
          ? mailCompanyActive(companyId, values)
          : mailRecruiters({ recruiterIds: selectedIds, ...values })}
        onClose={() => setMailMode(null)}
      />
    </Space>
  );
}
