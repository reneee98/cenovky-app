import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          background: '#fff0f0', 
          border: '1px solid #ffcdd2',
          borderRadius: '8px',
          color: '#d32f2f'
        }}>
          <h3>Niečo sa pokazilo</h3>
          <p>Skúste obnoviť stránku alebo sa vráťte späť a skúste to znova.</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              background: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Skúsiť znova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
} 