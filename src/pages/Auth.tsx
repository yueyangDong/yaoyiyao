import { useState } from 'react';
import { Card, Button, Input, Typography, Space, message, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      message.warning('请输入邮箱和密码');
      return;
    }
    if (password.length < 6) {
      message.warning('密码至少6位');
      return;
    }
    setLoading(true);
    const { error } = isRegister
      ? await signUp(email, password)
      : await signIn(email, password);
    setLoading(false);
    if (error) {
      message.error(error);
      return;
    }
    if (isRegister) {
      message.success('注册成功，请查看邮箱确认链接（或已在 Supabase 关闭邮箱验证则直接登录）');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 16px' }}>
      <Card style={{
        background: 'var(--bg-card-solid)',
        borderColor: 'var(--border-light)',
        boxShadow: 'var(--shadow-md)',
      }}>
        <Title level={3} style={{
          textAlign: 'center',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          marginBottom: 4,
        }}>
          登录 / 注册
        </Title>
        <Text style={{
          display: 'block', textAlign: 'center',
          color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24,
        }}>
          登录后数据自动同步到云端
        </Text>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            size="large"
            placeholder="邮箱"
            prefix={<MailOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={email}
            onChange={e => setEmail(e.target.value)}
            onPressEnter={handleSubmit}
          />
          <Input.Password
            size="large"
            placeholder="密码"
            prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onPressEnter={handleSubmit}
          />

          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={handleSubmit}
            style={{ height: 44 }}
          >
            {isRegister ? '注册' : '登录'}
          </Button>
        </Space>

        <Divider style={{ borderColor: 'var(--border-light)', margin: '16px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Button type="link" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
