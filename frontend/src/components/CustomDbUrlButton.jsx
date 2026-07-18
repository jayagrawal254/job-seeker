import React, { useState } from 'react';
import { Button, Modal, Input, Tooltip, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

/**
 * Button that lets the user set a custom DB URL (e.g., a local‑storage URL).
 * The value is saved in `localStorage` under the key `customDbUrl` and
 * automatically appended to all API requests via the request interceptor
 * added to `src/api/client.js`.
 * The URL persists across page refreshes.
 */
export default function CustomDbUrlButton() {
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem('customDbUrl') || '';
    } catch {
      return '';
    }
  });

  const handleOk = () => {
    try {
      if (url) {
        localStorage.setItem('customDbUrl', url);
        message.success('Custom DB URL saved');
      } else {
        localStorage.removeItem('customDbUrl');
        message.info('Custom DB URL cleared');
      }
    } catch (e) {
      console.error('Failed to store custom DB URL', e);
      message.error('Unable to save URL');
    }
    setVisible(false);
  };

  return (
    <>
      <Tooltip title="Set a custom DB URL (persisted across refresh)">
        <Button
          type="default"
          icon={<SettingOutlined />}
          onClick={() => setVisible(true)}
          style={{ marginLeft: 8 }}
        >
          Custom DB URL
        </Button>
      </Tooltip>
      <Modal
        title="Custom Database URL"
        open={visible}
        onOk={handleOk}
        onCancel={() => setVisible(false)}
        okText="Save"
      >
        <Input
          placeholder="e.g., file:///path/to/your.db or https://example.com/db"
          value={url}
          onChange={e => setUrl(e.target.value)}
          allowClear
        />
      </Modal>
    </>
  );
}
