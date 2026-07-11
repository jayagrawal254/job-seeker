import React from 'react';
import { Result, Button } from 'antd';

/**
 * Error boundary that catches unhandled errors in the component tree
 * and shows a user-friendly fallback UI.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={this.state.error?.message || 'An unexpected error occurred.'}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
