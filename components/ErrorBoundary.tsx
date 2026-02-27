import React, { useState, useCallback } from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

// Functional wrapper that uses a class-based inner component to catch errors
// Using a class under the hood because only class components support componentDidCatch
class ErrorBoundaryClass extends React.Component<
    ErrorBoundaryProps & { onError: (error: Error) => void },
    { hasError: boolean; error: Error | null }
> {
    state = { hasError: false, error: null as Error | null };
    declare props: ErrorBoundaryProps & { onError: (error: Error) => void };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('Uncaught error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 text-slate-500 p-6 text-center">
                    <svg className="w-12 h-12 mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-lg font-bold text-slate-700">Map Display Error</h2>
                    <p className="text-sm mt-2 max-w-md">The spatial rendering engine encountered an error. The rest of the application remains functional.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback }) => {
    const handleError = useCallback((error: Error) => {
        console.error('ErrorBoundary caught:', error);
    }, []);

    return (
        <ErrorBoundaryClass onError={handleError} fallback={fallback}>
            {children}
        </ErrorBoundaryClass>
    );
};

export default ErrorBoundary;
