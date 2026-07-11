import { Layout, Menu, Typography } from 'antd';
import { Outlet, Link, useLocation } from 'react-router-dom';

const { Header, Content } = Layout;

export default function App() {
  const location = useLocation();
  const selected = location.pathname.startsWith('/mails') ? 'mails' : 'companies';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link to="/">
          <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>
            Recly v2
          </Typography.Title>
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selected]}
          style={{ flex: 1, minWidth: 0 }}
          items={[
            { key: 'companies', label: <Link to="/">Companies</Link> },
            { key: 'mails', label: <Link to="/mails">Mail Logs</Link> }
          ]}
        />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
