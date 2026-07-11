import { useState } from 'react';
import { Button, message } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';

interface Props {
  targetRef: React.RefObject<HTMLElement | null>;
  fileName?: string;
  buttonText?: string;
}

export default function ShareButton({ targetRef, fileName = 'yaoyiyao', buttonText = '保存图片' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleCapture = async () => {
    if (!targetRef.current) {
      message.warning('没有可导出的内容');
      return;
    }

    setLoading(true);
    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#F7F5F0',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `${fileName}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('图片已保存');
    } catch {
      message.error('导出失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      icon={<CameraOutlined />}
      loading={loading}
      onClick={handleCapture}
      size="small"
      style={{
        borderRadius: 8,
        borderColor: 'var(--border-medium)',
        color: 'var(--text-secondary)',
      }}
    >
      {loading ? '生成中...' : buttonText}
    </Button>
  );
}
