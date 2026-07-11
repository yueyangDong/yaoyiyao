import { Drawer, Button, Space, Typography, Form, InputNumber, Cascader, Divider, Tag, Radio, Select } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Settings } from 'lucide-react';
import type { FormInstance } from 'antd';
import { pcaCode } from 'cn-division';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  birthplaceLng: number | null;
  onSave: () => void;
}

export default function ProfileDrawer({ open, onClose, form, birthplaceLng, onSave }: Props) {
  return (
    <Drawer
      title={<><Settings size={18} strokeWidth={1.5} style={{ marginRight: 8 }} />用户档案设置</>}
      open={open}
      onClose={onClose}
      width={380}
      extra={<Button type="primary" onClick={onSave}>保存档案</Button>}
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
          <Radio.Group>
            <Radio.Button value="male">男</Radio.Button>
            <Radio.Button value="female">女</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Divider>出生时间</Divider>
        <Space wrap>
          <Form.Item name="birthYear" label="年" rules={[{ required: true }]}>
            <InputNumber min={1900} max={2100} placeholder="1990" style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="birthMonth" label="月">
            <InputNumber min={1} max={12} placeholder="1" style={{ width: 65 }} />
          </Form.Item>
          <Form.Item name="birthDay" label="日">
            <InputNumber min={1} max={31} placeholder="1" style={{ width: 65 }} />
          </Form.Item>
        </Space>
        <Space wrap>
          <Form.Item name="birthHour" label="时">
            <InputNumber min={0} max={23} placeholder="0" style={{ width: 65 }} />
          </Form.Item>
          <Form.Item name="birthMinute" label="分">
            <InputNumber min={0} max={59} placeholder="0" style={{ width: 65 }} />
          </Form.Item>
        </Space>

        <Divider>出生地（可选，用于真太阳时校正）</Divider>
        <Form.Item name="birthplace" label="省/市/区">
          <Cascader
            options={pcaCode}
            fieldNames={{ label: 'n', value: 'c', children: 'ch' }}
            placeholder="请选择省市区"
            changeOnSelect
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 12 }}>
          默认经度：120°E（北京时间）。真太阳时 = 北京时间 + (当地经度 - 120) × 4分钟。
          {birthplaceLng && birthplaceLng !== 120 && (
            <Tag style={{ marginLeft: 8 }}>当前经度：{birthplaceLng}°E</Tag>
          )}
        </Text>
      </Form>
    </Drawer>
  );
}
