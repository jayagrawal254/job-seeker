import { useEffect, useState } from 'react';
import { Button, Select, Space, Upload, message } from 'antd';
import { getResumes, uploadResume } from '../api';

/**
 * Resume picker + uploader. `value` is the selected filename (or null = no attachment),
 * `onChange(filename|null)` reports changes. Uploading a new resume selects it.
 */
export default function ResumeSelect({ value, onChange }) {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = () => getResumes().then(setResumes).catch(() => {});
  useEffect(() => { load(); }, []);

  const doUpload = async file => {
    setUploading(true);
    try {
      const { filename } = await uploadResume(file);
      await load();
      onChange(filename);
      message.success(`Uploaded ${filename}`);
    } catch (err) {
      message.error(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
    return false; // prevent antd's default upload
  };

  return (
    <Space>
      <Select
        style={{ width: 280 }}
        placeholder="Attach resume"
        allowClear
        value={value || undefined}
        onChange={v => onChange(v || null)}
        options={[
          { value: '', label: 'No attachment' },
          ...resumes.map(r => ({ value: r.filename, label: `${r.filename} (${r.sizeKb} KB)` }))
        ]}
      />
      <Upload beforeUpload={doUpload} showUploadList={false} accept=".pdf,.doc,.docx">
        <Button loading={uploading}>Upload new</Button>
      </Upload>
    </Space>
  );
}
