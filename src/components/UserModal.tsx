import { Modal, Button, Space, Typography, Form, Input, InputNumber, Cascader, Divider, Tag, Radio, Select, List, Popconfirm } from 'antd';
import { SwapOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { message } from 'antd';
import type { FormInstance } from 'antd';
import type { StoredUser } from '../context/UserContext';
import { pcaCode } from 'cn-division';

const { Text } = Typography;

interface Props {
  open: boolean;
  editingUser: StoredUser | null;
  form: FormInstance;
  users: StoredUser[];
  currentUser: StoredUser | null;
  onClose: () => void;
  onSave: () => void;
  onEdit: (user: StoredUser) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  formatBirth: (u: StoredUser) => string;
}

export default function UserModal({
  open, editingUser, form, users, currentUser,
  onClose, onSave, onEdit, onDelete, onSwitch, formatBirth,
}: Props) {
  return (
    <Modal
      title={editingUser ? '编辑用户' : '添加用户'}
      open={open}
      onCancel={onClose}
      onOk={onSave}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="name" label="姓名/昵称" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="如：张三" />
        </Form.Item>

        <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
          <Radio.Group>
            <Radio.Button value="男">男</Radio.Button>
            <Radio.Button value="女">女</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="birthCalendar" label="历法">
          <Radio.Group>
            <Radio.Button value="solar">公历</Radio.Button>
            <Radio.Button value="lunar">农历</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider>出生时间</Divider>
        <Space wrap>
          <Form.Item name="birthYear" label="年" rules={[{ required: true }]}>
            <InputNumber min={1900} max={2100} placeholder="1990" style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="birthMonth" label="月" rules={[{ required: true }]}>
            <InputNumber min={1} max={12} placeholder="1" style={{ width: 65 }} />
          </Form.Item>
          <Form.Item name="birthDay" label="日" rules={[{ required: true }]}>
            <InputNumber min={1} max={31} placeholder="1" style={{ width: 65 }} />
          </Form.Item>
        </Space>
        <Space wrap>
          <Form.Item name="birthHour" label="时" rules={[{ required: true }]}>
            <InputNumber min={0} max={23} placeholder="0" style={{ width: 65 }} />
          </Form.Item>
          <Form.Item name="birthMinute" label="分">
            <InputNumber min={0} max={59} placeholder="0" style={{ width: 65 }} />
          </Form.Item>
        </Space>

        <Form.Item name="birthplace" label="出生地">
          <Cascader
            options={pcaCode}
            fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
            placeholder="请选择省市区"
            changeOnSelect
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>

      {users.length > 0 && (
        <>
          <Divider>已有用户</Divider>
          <List
            size="small"
            dataSource={users}
            renderItem={(u) => (
              <List.Item
                actions={[
                  <Button
                    key="switch" type="link" size="small"
                    icon={<SwapOutlined />}
                    onClick={() => {
                      onSwitch(u.id);
                      message.success(`已切换到「${u.name}」`);
                      onClose();
                    }}
                    disabled={u.id === currentUser?.id}
                  >
                    {u.id === currentUser?.id ? '当前' : '切换'}
                  </Button>,
                  <Button key="edit" type="link" size="small" icon={<EditOutlined />}
                    onClick={() => onEdit(u)} />,
                  <Popconfirm
                    key="del" title="确定删除此用户？"
                    onConfirm={() => onDelete(u.id)}
                    okText="删除" cancelText="取消"
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--text-primary)', color: 'var(--text-inverse)',
                      fontWeight: 600, fontSize: 14,
                    }}>
                      {u.name.charAt(0)}
                    </span>
                  }
                  title={<Space><Text strong>{u.name}</Text><Tag>{u.gender}</Tag></Space>}
                  description={`${formatBirth(u)} ${u.birthCalendar === 'solar' ? '公历' : '农历'}`}
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
}
