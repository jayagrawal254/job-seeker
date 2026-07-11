import { Tag, Tooltip } from 'antd';
import { STATUS_COLORS } from '../constants';

/**
 * Reusable status tag that maps mail/recruiter/company status to colored tags.
 *
 * For numeric status (recruiter/company): 1 = Active (green), else Inactive.
 * For string status (mail): uses STATUS_COLORS mapping.
 */
export function ActivityStatusTag({ status }) {
  return status === 1
    ? <Tag color="green">Active</Tag>
    : <Tag>Inactive</Tag>;
}

export function MailStatusTag({ status, error }) {
  return (
    <Tooltip title={error || undefined}>
      <Tag color={STATUS_COLORS[status]}>{status}</Tag>
    </Tooltip>
  );
}
