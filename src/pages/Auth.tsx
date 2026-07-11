import { useState } from 'react';
import { Card, Button, Input, Typography, Space, message, Divider, Alert } from 'antd';
import { MailOutlined, LockOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      message.warning('请输入邮箱和密码');
      return;
    }
    if (password.length < 6) {
      message.warning('密码至少6位');
      return;
    }
    if (isRegister && password !== password2) {
      message.warning('两次密码不一致');
      return;
    }
    setLoading(true);
    if (isRegister) {
      const { error } = await signUp(email, password);
      setLoading(false);
      if (error) {
        message.error(typeof error === 'string' && error.length > 0 ? error : '注册失败，请重试');
        return;
      }
      // auto-confirm 已开，注册即登录
      setSuccess(true);
      message.success('注册成功，已自动登录');
      setTimeout(() => navigate('/profile'), 1500);
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        if (typeof error === 'string' && error.includes('Invalid login credentials')) {
          message.error('邮箱或密码错误');
        } else if (typeof error === 'string' && error.length > 0) {
          message.error(error);
        } else {
          message.error('登录失败，请检查网络或稍后重试');
        }
        return;
      }
      setSuccess(true);
      message.success('登录成功');
      setTimeout(() => navigate('/'), 1000);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setPassword('');
    setPassword2('');
    setSuccess(false);
  };

  if (success) {
    return (
      <div style={{ maxWidth: 400, margin: '60px auto', padding: '0 16px' }}>
        <Card style={{
          background: 'var(--bg-card-solid)',
          borderColor: 'var(--border-light)',
          boxShadow: 'var(--shadow-md)',
          textAlign: 'center',
        }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: 'var(--color-ji)', marginBottom: 16 }} />
          <Title level={3} style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            marginBottom: 8,
          }}>
            {isRegister ? '注册成功' : '登录成功'}
          </Title>
          <Text style={{ color: 'var(--text-secondary)' }}>
            {isRegister ? '数据已自动同步到云端' : '欢迎回来'}
          </Text>
        </Card>
      </div>
    );
  }

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
          {isRegister ? '注册' : '登录'}
        </Title>
        <Text style={{
          display: 'block', textAlign: 'center',
          color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16,
        }}>
          {isRegister
            ? '注册即登录，数据自动同步到云端'
            : '登录后数据自动同步到云端'}
        </Text>

        {isRegister && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="注册即自动登录，无需邮箱确认"
            style={{ marginBottom: 16, borderRadius: 10, fontSize: 12 }}
          />
        )}

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
            placeholder="密码（至少6位）"
            prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onPressEnter={handleSubmit}
          />
          {isRegister && (
            <Input.Password
              size="large"
              placeholder="再次输入密码"
              prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={password2}
              onChange={e => setPassword2(e.target.value)}
              onPressEnter={handleSubmit}
            />
          )}

          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={handleSubmit}
            style={{ height: 44 }}
          >
            {isRegister ? '注册并登录' : '登录'}
          </Button>
        </Space>

        <Divider style={{ borderColor: 'var(--border-light)', margin: '16px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Button type="link" onClick={switchMode}>
            {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
