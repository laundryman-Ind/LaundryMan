import React from 'react'

/**
 * ErrorBoundary — catches any uncaught render error in the React tree and
 * shows a recovery screen instead of a white screen. Without this, a single
 * component crash (e.g. MapLibre WebGL failure, null reference) unmounts
 * the entire app with no way to recover except force-closing.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    try {
      sessionStorage.setItem('lm_last_error', JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        time: new Date().toISOString()
      }))
    } catch { /* ignore */ }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh',
          background: '#F3F1E9', padding: '32px 24px', textAlign: 'center',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: '#FBE4DE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, fontSize: 28,
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: '-0.8px',
            fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8,
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontSize: 13, color: '#6A6F78', fontWeight: 600,
            lineHeight: 1.55, maxWidth: 300, marginBottom: 24,
          }}>
            The app ran into an unexpected error. Tap below to try again.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: '#0E1116', color: '#FFC42E', border: 0,
              padding: '16px 32px', borderRadius: 16, fontWeight: 900,
              fontSize: 14, letterSpacing: '-0.2px', cursor: 'pointer',
              width: '100%', maxWidth: 280,
            }}
          >
            Try again
          </button>
          <p style={{
            fontSize: 11, color: '#B4B8BF', marginTop: 16, fontWeight: 600,
          }}>
            If this keeps happening, restart the app.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
