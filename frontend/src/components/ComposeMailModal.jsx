import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, Select, message } from 'antd';
import { getTemplates } from '../api';
import ResumeSelect from './ResumeSelect.jsx';
import MailPreview from './MailPreview.jsx';

/**
 * Compose + queue modal. `onSend({subject, body, templateId})` must return the backend
 * result ({queued, skippedAlreadyPending}). Nothing is mailed immediately — rows are
 * stored as 'pending' in mail_log and sent later by scripts/sendPendingMails.js.
 */
export default function ComposeMailModal({ open, title, recipientHint, onSend, onClose }) {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(undefined);
  const [attachment, setAttachment] = useState('Jay_Agrawal_Resume.pdf');
  const subject = Form.useWatch('subject', form);
  const body = Form.useWatch('body', form);

  useEffect(() => {
    if (open) getTemplates().then(setTemplates).catch(() => { });
  }, [open]);

  const applyTemplate = id => {
    setTemplateId(id);
    const t = templates.find(t => t.id === id);
    if (t) form.setFieldsValue({ subject: t.subject, body: t.body });
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    setSending(true);
    try {
      const result = await onSend({ ...values, templateId: templateId ?? null, attachment: attachment || null });
      message.success(
        `Queued ${result.queued} mail(s)` +
        (result.skippedAlreadyPending ? ` (${result.skippedAlreadyPending} already pending, skipped)` : '') +
        ' — run the send script to deliver them.'
      );
      form.resetFields();
      setTemplateId(undefined);
      onClose();
    } catch (err) {
      message.error(err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      okText="Queue mails"
      confirmLoading={sending}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); setTemplateId(undefined); onClose(); }}
      width={640}
    >
      {recipientHint && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message={recipientHint} />
      )}
      <Form form={form} layout="vertical">
        <Form.Item label="Template">
          <Select
            placeholder="Pick a template (optional) — fills subject & body"
            allowClear
            value={templateId}
            onChange={applyTemplate}
            options={templates.map(t => ({ value: t.id, label: t.name }))}
          />
        </Form.Item>
        <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
          <Input placeholder="Mail subject — {{recname}} / {{organisation}} are personalised per recruiter" />
        </Form.Item>
        <Form.Item name="body" label="Body (HTML supported)" rules={[{ required: true }]}>
          <Input.TextArea rows={8} placeholder="Write your mail… use {{recname}} and {{organisation}} placeholders" />
        </Form.Item>
        <Form.Item label="Resume">
          <ResumeSelect value={attachment} onChange={setAttachment} />
        </Form.Item>
      </Form>
      <MailPreview subject={subject} body={body} />
    </Modal>
  );
}
