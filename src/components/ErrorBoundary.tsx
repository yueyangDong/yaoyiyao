import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'antd';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.moduleName ? `-${this.props.moduleName}` : ''}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Alert
            type="error"
            showIcon
            message={`模块异常：${this.state.errorMessage}`}
            description={this.props.moduleName ? `模块「${this.props.moduleName}」加载出错，请检查控制台日志或刷新页面重试。` : '页面加载出错，请刷新页面重试。'}
            style={{ marginBottom: 16 }}
          />
          <Button onClick={() => { this.setState({ hasError: false, errorMessage: '' }); window.location.reload(); }}>
            刷新页面
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
