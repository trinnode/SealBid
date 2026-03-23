import React from "react";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error): void {
    console.error("Application render error:", error);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <h2 className="text-lg font-bold text-red-300 mb-3">
            UI Error Caught
          </h2>
          <p className="text-sm text-red-200/90 font-mono break-words mb-4">
            {this.state.errorMessage || "A render error occurred."}
          </p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 rounded bg-white text-black font-mono text-xs uppercase tracking-wider"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}
