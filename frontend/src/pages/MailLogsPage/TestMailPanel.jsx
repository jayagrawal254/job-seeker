import { useEffect, useState } from 'react';
import { Button, Col, Form, Input, Row, Select, message } from 'antd';
import { getTemplates, sendTestMail } from '../../api';
import ResumeSelect from '../../components/ResumeSelect.jsx';
import MailPreview from '../../components/MailPreview.jsx';

/**
 * Test email panel — send a one-off test email immediately.
 */
export default function TestMailPanel() {
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState([]);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState('Jay_Agrawal_Resume.pdf');
  const subject = Form.useWatch('subject', form);
  const body = Form.useWatch('body', form);

  useEffect(() => { getTemplates().then(setTemplates).catch(() => { }); }, []);

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
