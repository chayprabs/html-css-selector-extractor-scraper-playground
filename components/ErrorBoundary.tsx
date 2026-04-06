"use client";

import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
};

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorId: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught:", error, info);
    }
    this.props.onError?.(error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <DefaultErrorFallback
          error={this.state.error!}
          errorId={this.state.errorId!}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  errorId,
  onReset,
}: {
  error: Error;
  errorId: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <p className="text-sm font-medium text-[#e5e5e5] mb-2">Something went wrong</p>
      <p className="text-xs text-[#666] font-mono mb-4">Error ID: {errorId}</p>
      <div className="flex gap-2 mb-4">
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-xs bg-[#7c3aed] text-white rounded hover:bg-[#6d28d9] transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 text-xs bg-[#1e1e1e] text-[#888] border border-[#333] rounded hover:text-[#ccc] hover:border-[#555] transition-colors"
        >
          Reload page
        </button>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="w-full max-w-md text-left">
          <summary className="text-xs text-[#555] cursor-pointer hover:text-[#888]">
            Error details
          </summary>
          <pre className="mt-2 p-3 bg-[#0d0d0d] border border-[#222] rounded text-[10px] text-red-400 font-mono overflow-auto max-h-40">
            {error.message}
            {"\n"}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
