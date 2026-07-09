import { useState } from 'react';
import {
  Card, Button, Typography, Space, Divider, Radio,
  Row, Col, Tag, Steps, Upload, message, Descriptions, Collapse, Alert,
} from 'antd';
import { SmileOutlined, UploadOutlined, ArrowRightOutlined, ArrowLeftOutlined, BookOutlined } from '@ant-design/icons';
import { FaceInput, FaceResult, analyzeFace } from '../utils/faceRule';
import { useUser } from '../context/UserContext';

const { Title, Text, Paragraph } = Typography;

const STEPS = [
  { title: '面型', key: 'faceShape', mapTo: '整体格局' },
  { title: '额头', key: 'forehead', mapTo: '天庭（官禄宫）' },
  { title: '眉毛', key: 'eyebrow', mapTo: '兄弟宫' },
  { title: '眼睛', key: 'eye', mapTo: '田宅宫/男女宫' },
  { title: '鼻子', key: 'nose', mapTo: '财帛宫' },
  { title: '嘴巴', key: 'mouth', mapTo: '出纳宫' },
  { title: '下巴', key: 'chin', mapTo: '地阁（奴仆宫）' },
] as const;

const OPTIONS: Record<string, { label: string; value: string }[]> = {
  faceShape: [
    { label: '圆脸', value: '圆脸' }, { label: '方脸', value: '方脸' }, { label: '长脸', value: '长脸' },
    { label: '瓜子脸', value: '瓜子脸' }, { label: '国字脸', value: '国字脸' },
  ],
  forehead: [
    { label: '宽阔饱满', value: '宽阔饱满' }, { label: '窄小', value: '窄小' }, { label: '适中', value: '适中' },
  ],
  eyebrow: [
    { label: '浓眉', value: '浓眉' }, { label: '淡眉', value: '淡眉' }, { label: '剑眉', value: '剑眉' },
    { label: '柳叶眉', value: '柳叶眉' }, { label: '八字眉', value: '八字眉' },
  ],
  eye: [
    { label: '大眼', value: '大眼' }, { label: '小眼', value: '小眼' }, { label: '丹凤眼', value: '丹凤眼' },
    { label: '桃花眼', value: '桃花眼' }, { label: '三角眼', value: '三角眼' },
  ],
  nose: [
    { label: '高挺', value: '高挺' }, { label: '扁平', value: '扁平' }, { label: '蒜头鼻', value: '蒜头鼻' },
    { label: '鹰钩鼻', value: '鹰钩鼻' }, { label: '圆润', value: '圆润' },
  ],
  mouth: [
    { label: '大嘴', value: '大嘴' }, { label: '小嘴', value: '小嘴' }, { label: '厚唇', value: '厚唇' },
    { label: '薄唇', value: '薄唇' }, { label: '适中', value: '适中' },
  ],
  chin: [
    { label: '圆润', value: '圆润' }, { label: '尖窄', value: '尖窄' }, { label: '方宽', value: '方宽' }, { label: '双下巴', value: '双下巴' },
  ],
};

// 面相部位到传统框架的映射
const FACE_FRAMEWORK_MAP: Record<string, { sanTing: string; gong: string; wuXingLiuYao: string }> = {
  'forehead': { sanTing: '上停（15-30岁运）', gong: '官禄宫/父母宫/迁移宫', wuXingLiuYao: '火星/天中' },
  'eyebrow': { sanTing: '上停→中停过渡', gong: '兄弟宫/命宫', wuXingLiuYao: '罗睺/计都（眉为计都）' },
  'eye': { sanTing: '中停（30-50岁运）', gong: '田宅宫/男女宫', wuXingLiuYao: '太阳/太阴' },
  'nose': { sanTing: '中停（30-50岁运）', gong: '财帛宫/疾厄宫', wuXingLiuYao: '土星（鼻为审辨官）' },
  'mouth': { sanTing: '下停（50岁以后运）', gong: '出纳宫', wuXingLiuYao: '水星' },
  'chin': { sanTing: '下停（50岁以后运）', gong: '奴仆宫/地阁', wuXingLiuYao: '地阁' },
  'faceShape': { sanTing: '三停整体比例', gong: '命宫（整体格局）', wuXingLiuYao: '五星六曜综合' },
};

export default function Mianxiang() {
  const { currentUser, addHistory } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<FaceInput>>({});
  const [result, setResult] = useState<FaceResult | null>(null);

  const stepKey = STEPS[currentStep].key;
  const currentValue = formData[stepKey as keyof FaceInput] as string;

  const handleSelect = (value: string) => {
    setFormData({ ...formData, [stepKey]: value });
  };

  const handleNext = () => {
    if (!currentValue) { message.warning('请选择一个选项'); return; }
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    if (!currentValue) { message.warning('请选择当前步骤的选项'); return; }
    const allFilled = STEPS.every((s) => formData[s.key as keyof FaceInput]);
    if (!allFilled) { message.warning('请完成所有步骤的选择'); return; }
    const res = analyzeFace(formData as FaceInput);
    setResult(res);
    message.success('面相分析完成');
    addHistory({
      userId: currentUser?.id || '',
      module: 'mianxiang',
      queryParams: { ...formData },
      resultSummary: `看面相：${res.summary.slice(0, 30)}…`,
    });
  };

  const handleReset = () => {
    setCurrentStep(0); setFormData({}); setResult(null);
  };

  if (result) {
    return (
      <div style={{ padding: '16px 0' }}>
        <Title level={3} style={{ textAlign: 'center', color: '#8b4513' }}>面相分析结果</Title>

        {/* 传统框架展示 */}
        <Card title="您的面相特征（传统面相学框架）" style={{ marginBottom: 16 }}>
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            {STEPS.map((s) => {
              const value = formData[s.key as keyof FaceInput];
              const framework = FACE_FRAMEWORK_MAP[s.key];
              return (
                <Descriptions.Item key={s.key} label={<Text strong>{s.title}（{framework?.gong}）</Text>}>
                  <Tag color="purple">{String(value)}</Tag>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                    {framework?.sanTing} · {framework?.wuXingLiuYao}
                  </Text>
                </Descriptions.Item>
              );
            })}
          </Descriptions>
        </Card>

        {/* 综合分析 */}
        <Card title="综合面相分析" className="mystic-card" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>性格特征</Title>
              <Paragraph>{result.personality}</Paragraph>
            </div>
            <div>
              <Title level={5}>运势走向</Title>
              <Paragraph>{result.fortune}</Paragraph>
            </div>
            <div>
              <Title level={5}>事业方向</Title>
              <Paragraph>{result.career}</Paragraph>
            </div>
            <div>
              <Title level={5}>感情婚姻</Title>
              <Paragraph>{result.relationship}</Paragraph>
            </div>
            <div>
              <Title level={5}>健康状况</Title>
              <Paragraph>{result.health}</Paragraph>
            </div>
            <Divider />
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ fontSize: 18, color: '#c0392b' }}>{result.summary}</Text>
            </div>
          </Space>
        </Card>

        {/* 白话解读关键特征 */}
        <Collapse
          items={[{
            key: 'detail',
            label: '各部位面相白话解读',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {STEPS.map((s) => {
                  const value = formData[s.key as keyof FaceInput];
                  const framework = FACE_FRAMEWORK_MAP[s.key];
                  if (!value) return null;
                  return (
                    <div key={s.key} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Text strong>{s.title}：{String(value)}</Text>
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        对应面相学中的「{framework?.gong}」——{framework?.sanTing}
                      </Text>
                    </div>
                  );
                })}
              </Space>
            ),
          }]}
          style={{ marginBottom: 16 }}
        />

        <div style={{ textAlign: 'center' }}>
          <Button onClick={handleReset} size="large">重新测试</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={3} style={{ textAlign: 'center', color: '#8b4513' }}>看面相</Title>

      {/* 面相学理论基础 */}
      <Collapse
        style={{ marginBottom: 16 }}
        items={[{
          key: 'theory',
          label: <><BookOutlined /> 面相学理论基础（点击展开了解）</>,
          children: (
            <div style={{ fontSize: 13 }}>
              <Title level={5}>三停</Title>
              <Paragraph>
                <Text strong>上停（额头到眉毛）：</Text>代表15-30岁的早年运，看智慧、学历、长辈缘。<br />
                <Text strong>中停（眉毛到鼻尖）：</Text>代表30-50岁的中年运，看事业、财运、人际关系。<br />
                <Text strong>下停（鼻尖到下巴）：</Text>代表50岁以后的晚年运，看子女、家庭、晚年福气。
              </Paragraph>
              <Title level={5}>十二宫</Title>
              <Paragraph>
                面相学将脸分为十二个区域，每个区域代表一个宫位：<br />
                命宫（眉心）、兄弟宫（眉毛）、夫妻宫（眼角）、子女宫（眼下）、财帛宫（鼻子）、
                疾厄宫（鼻梁）、迁移宫（额头两侧）、交友宫（下巴）、官禄宫（额头正中）、
                田宅宫（上眼皮）、福德宫（眉尾上方）、父母宫（额角）。
              </Paragraph>
              <Title level={5}>五星六曜</Title>
              <Paragraph>
                五星：额头=火星、下巴=水星、左耳=金星、右耳=木星、鼻子=土星。<br />
                六曜：左眼=太阳、右眼=太阴、左眉=罗睺、右眉=计都、口为月孛、鼻准为紫气。
              </Paragraph>
              <Alert message="以上为面相学的基础知识框架。下面的问诊会将你的五官特征映射到这些传统体系中进行分析。" type="info" showIcon />
            </div>
          ),
        }]}
      />

      <Card style={{ marginBottom: 16 }}>
        <Steps
          current={currentStep} size="small"
          items={STEPS.map((s) => ({ title: s.title }))}
          style={{ marginBottom: 24 }}
        />

        <Card title={
          <Space>
            <SmileOutlined />
            <Text strong>选择您的{STEPS[currentStep].title}特征</Text>
            <Tag color="blue" style={{ fontSize: 11 }}>{STEPS[currentStep].mapTo}</Tag>
          </Space>
        }>
          <Radio.Group value={currentValue} onChange={(e) => handleSelect(e.target.value)} style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
              {OPTIONS[stepKey].map((opt) => (
                <Col xs={12} sm={8} key={opt.value}>
                  <div
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '16px 12px', border: `2px solid ${currentValue === opt.value ? '#1890ff' : '#d9d9d9'}`,
                      borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                      background: currentValue === opt.value ? '#e6f7ff' : '#fff', transition: 'all 0.2s',
                    }}
                  >
                    <Text strong={currentValue === opt.value}>{opt.label}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Radio.Group>
        </Card>

        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handlePrev} disabled={currentStep === 0} icon={<ArrowLeftOutlined />}>上一步</Button>
          <Text type="secondary">{currentStep + 1} / {STEPS.length}</Text>
          {currentStep < STEPS.length - 1 ? (
            <Button type="primary" onClick={handleNext} icon={<ArrowRightOutlined />}>下一步</Button>
          ) : (
            <Button type="primary" onClick={handleSubmit}>提交分析</Button>
          )}
        </div>
      </Card>

      <Card>
        <div style={{ textAlign: 'center' }}>
          <Upload accept="image/*" showUploadList={false}
            beforeUpload={() => { message.info('此功能依赖AI视觉接口，当前仅支持问卷模式。敬请期待后续更新！'); return false; }}>
            <Button icon={<UploadOutlined />} size="large">上传照片（开发中）</Button>
          </Upload>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            上传照片功能依赖AI视觉接口，当前仅支持问卷模式，保留扩展能力
          </Text>
        </div>
      </Card>
    </div>
  );
}
