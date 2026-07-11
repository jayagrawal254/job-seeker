import { useCallback, useEffect, useState } from 'react';
import {
  AutoComplete, Badge, Button, Card, Col, DatePicker, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Tooltip, message
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { mailCompaniesTopActive } from '../../api';
import ComposeMailModal from '../../components/ComposeMailModal.jsx';
import { ActivityStatusTag } from '../../components/StatusTag';
import LocationTags from '../../components/LocationTags';
import { getPresets, savePreset, deletePreset, loadPreset } from '../../utils/filterPresets';
import { useLocations } from '../../context/LocationContext';
import { EMPTY_FILTERS } from '../../constants';
import { dateOnly } from '../../utils/formatters';
import { useCompanies } from '../../hooks/useCompanies';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { locations } = useLocations();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [options, setOptions] = useState([]);
  const [sort, setSort] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [topN, setTopN] = useState(5);
  const [mailOpen, setMailOpen] = useState(false);
  const [presets, setPresets] = useState({});
  const [selectedPreset, setSelectedPreset] = useState(undefined);
  
  const { data, loading, loadCompanies, searchAutocomplete } = useCompanies();

  useEffect(() => { setPresets(getPresets()); }, []);

  const applyPreset = name => {
    setSelectedPreset(name);
    const f = loadPreset(name);
    if (f) { setFilters(f); loadCompanies(1, f); }
  };

  const doSavePreset = () => {
    let name = '';
    Modal.confirm({
      title: 'Save current filters as…',
      content: <Input placeholder="Preset name" onChange={e => { name = e.target.value; }} />,
      onOk: () => {
        if (!name.trim()) { message.error('Enter a name'); return Promise.reject(); }
        setPresets(savePreset(name.trim(), filters));
        setSelectedPreset(name.trim());
        message.success(`Saved "${name.trim()}"`);
      }
    });
  };

  const doDeletePreset = () => {
    if (!selectedPreset) return;
    setPresets(deletePreset(selectedPreset));
    setSelectedPreset(undefined);
    message.success('Preset deleted');
  };

  useEffect(() => { loadCompanies(1, EMPTY_FILTERS); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearchTyping = async term => {
    setFilters(f => ({ ...f, search: term }));
    const results = await searchAutocomplete(term);
    setOptions(results.map(c => ({
      value: c.organisation || c.company_name || c.domain,
      label: `${c.organisation || c.company_name || '(no name)'} — ${c.domain || ''} (${c.recruiter_count})`,
      company: c
    })));
  };

  const columns = [
    { title: 'ID', key: 'company_id', dataIndex: 'company_id', width: 80, sorter: true },
    {
      title: 'Company', key: 'company', sorter: true,
      render: (_, c) => c.organisation || c.company_name || '(no name)'
    },
    { title: 'Domain', key: 'domain', dataIndex: 'domain', sorter: true },
    {
      title: 'Status', key: 'status', dataIndex: 'status', width: 100, sorter: true,
      render: s => <ActivityStatusTag status={s} />
    },
    {
      title: 'Experience', key: 'min', width: 130, sorter: true,
      render: (_, c) => (c.min !== null && c.max !== null ? `${c.min}–${c.max} yrs` : '—')
    },
    {
      title: 'Salary', key: 'minsal', width: 120, sorter: true,
      render: (_, c) => (c.minsal !== null && c.maxsal !== null ? `${c.minsal}–${c.maxsal}` : '—')
    },
    {
      title: 'Last job posted', key: 'last_job_posted_date', dataIndex: 'last_job_posted_date',
      width: 160, sorter: true,
      render: d => dateOnly(d) || '—'
    },
    {
      title: 'Locations',
      render: (_, c) => <LocationTags csv={c.company_location_ids} max={6} />
    },
    {
      title: 'Recruiters (active / total)', key: 'active_recruiter_count', width: 170, sorter: true,
      render: (_, c) => `${c.active_recruiter_count ?? 0} / ${c.recruiter_count}`
    },
    {
      title: 'Mailed', key: 'last_mailed_date', width: 130, sorter: true,
      render: (_, c) => (c.mailed_count > 0
        ? (
          <Tooltip title={`${c.mailed_count} mail(s) queued/sent`}>
            <Badge count={c.mailed_count} size="small" offset={[8, 0]}>
              <Tag color="purple">{dateOnly(c.last_mailed_date)}</Tag>
            </Badge>
          </Tooltip>
        )
        : <span style={{ color: '#bbb' }}>—</span>)
    }
  ];

  const onTableChange = (pagination, _tableFilters, sorter) => {
    const s = sorter && sorter.order
      ? { sortBy: sorter.columnKey, sortDir: sorter.order === 'ascend' ? 'asc' : 'desc' }
      : null;
    setSort(s);
    loadCompanies(pagination.current, filters, s);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Filters">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <AutoComplete
              style={{ width: '100%' }}
              placeholder="Search company / domain"
              value={filters.search}
              options={options}
              onSearch={onSearchTyping}
              onSelect={(_, option) => navigate(`/company/${option.company.company_id}`)}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filters.status}
              onChange={v => setFilters(f => ({ ...f, status: v }))}
              options={[
                { value: '1', label: 'Active (posted jobs)' },
                { value: '0', label: 'Inactive' },
                { value: 'all', label: 'All companies' }
              ]}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Locations"
              allowClear
              value={filters.locations}
              onChange={v => setFilters(f => ({ ...f, locations: v }))}
              optionFilterProp="label"
              options={locations.map(l => ({ value: l.id, label: l.name }))}
            />
          </Col>
          <Col xs={24} md={6}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={['Last job posted from', 'to']}
              value={filters.lastPosted}
              onChange={v => setFilters(f => ({ ...f, lastPosted: v }))}
            />
          </Col>
          <Col xs={12} md={3}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Min exp"
              value={filters.minExp} onChange={v => setFilters(f => ({ ...f, minExp: v ?? undefined }))} />
          </Col>
          <Col xs={12} md={3}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Max exp"
              value={filters.maxExp} onChange={v => setFilters(f => ({ ...f, maxExp: v ?? undefined }))} />
          </Col>
          <Col xs={12} md={3}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Min salary"
              value={filters.minSal} onChange={v => setFilters(f => ({ ...f, minSal: v ?? undefined }))} />
          </Col>
          <Col xs={12} md={3}>
            <InputNumber style={{ width: '100%' }} min={0} placeholder="Max salary"
              value={filters.maxSal} onChange={v => setFilters(f => ({ ...f, maxSal: v ?? undefined }))} />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap>
              <Button type="primary" onClick={() => loadCompanies(1, filters, sort)}>Apply filters</Button>
              <Button onClick={() => {
                setFilters(EMPTY_FILTERS); setOptions([]); setSelectedPreset(undefined); loadCompanies(1, EMPTY_FILTERS);
              }}>Reset</Button>
              <Select
                style={{ width: 180 }}
                placeholder="Saved filters"
                allowClear
                value={selectedPreset}
                onChange={v => (v ? applyPreset(v) : setSelectedPreset(undefined))}
                options={Object.keys(presets).map(n => ({ value: n, label: n }))}
                notFoundContent="No saved filters"
              />
              <Button onClick={doSavePreset}>Save current</Button>
              <Button danger disabled={!selectedPreset} onClick={doDeletePreset}>Delete</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Space wrap>
          <span>Bulk mail — top</span>
          <InputNumber min={1} max={50} value={topN} onChange={v => setTopN(v || 5)} style={{ width: 70 }} />
          <span>most-recently-active recruiters of each selected company</span>
          <Button
            type="primary"
            disabled={!selectedIds.length}
            onClick={() => setMailOpen(true)}
          >
            Mail selected companies ({selectedIds.length})
          </Button>
        </Space>
      </Card>

      <Table
        rowKey="company_id"
        columns={columns}
        dataSource={data.companies}
        loading={loading}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds, preserveSelectedRowKeys: true }}
        onRow={c => ({
          onClick: e => {
            if (e.target.closest('.ant-checkbox-wrapper, .ant-table-selection-column')) return;
            window.open(`/company/${c.company_id}`, '_blank', 'noopener');
          },
          style: { cursor: 'pointer' }
        })}
        onChange={onTableChange}
        pagination={{
          current: data.page,
          pageSize: data.limit,
          total: data.total,
          showSizeChanger: false,
          showTotal: t => `${t} companies`
        }}
      />

      <ComposeMailModal
        open={mailOpen}
        title={`Mail top ${topN} active recruiters of ${selectedIds.length} selected compan${selectedIds.length === 1 ? 'y' : 'ies'}`}
        recipientHint={`For each selected company, the ${topN} recruiters who posted a job most recently will be queued. Inactive companies with no active recruiters are skipped.`}
        onSend={values => mailCompaniesTopActive({ companyIds: selectedIds, topN, ...values })
          .then(r => { loadCompanies(data.page, filters, sort); return r; })}
        onClose={() => setMailOpen(false)}
      />
    </Space>
  );
}
