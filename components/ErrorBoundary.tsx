import React, { useState, useCallback } from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    /** Optional label for error reporting context (e.g. "MapCanvas", "ProjectSidebar") */
    screen?: string;
}

// ─── Inner Class — only class components support componentDidCatch ────────────

class ErrorBoundaryClass extends React.Component<
    ErrorBoundaryProps & { onError: (error: Error, info: React.ErrorInfo) => void },
    { hasError: boolean; error: Error | null; retryCount: number }
> {
    state = { hasError: false, error: null as Error | null, retryCount: 0 };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Send to Firebase error tracker with screen context
        this.props.onError(error, info);
    }

    handleRetry = () => {
        this.setState(prev => ({
            hasError: false,
            error: null,
            retryCount: prev.retryCount + 1,
        }));
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return <>{this.props.fallback}</>;

            return (
                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 text-slate-500 p-8 text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-700">Something went wrong</h2>
                        <p className="text-sm mt-1.5 max-w-xs text-slate-400 leading-relaxed">
                            {this.props.screen
                                ? `The ${this.props.screen} encountered an error.`
                                : 'An unexpected error occurred.'}{' '}
                            The rest of the app remains functional.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre className="mt-3 text-left text-[10px] bg-red-50 text-red-700 p-3 rounded-lg max-w-sm overflow-auto max-h-32">
                                {this.state.error.message}
                            </pre>
                        )}
                    </div>
                    {this.state.retryCount < 3 && (
                        <button
                            onClick={this.handleRetry}
                            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-600/25"
                        >
                            Try again
                        </button>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── Public Wrapper ──────────────────────────────────────────────────────────

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback, screen }) => {
    const handleError = useCallback((error: Error, info: React.ErrorInfo) => {
        // Lazy import to avoid circular dependency at load time
        import('../utils/firebasePlatform').then(({ logError }) => {
            logError(error, {
                screen: screen || 'unknown',
                action: 'react_error_boundary',
                metadata: {
                    componentStack: (info.componentStack || '').substring(0, 500),
                },
            });
        }).catch(() => {
            // Fallback: at least log to console
            console.error('[ErrorBoundary]', error, info);
        });
    }, [screen]);

    return (
        <ErrorBoundaryClass onError={handleError} fallback={fallback} screen={screen}>
            {children}
        </ErrorBoundaryClass>
    );
};

export default ErrorBoundary;
