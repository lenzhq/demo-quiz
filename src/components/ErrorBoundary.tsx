import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-lg font-bold text-warm-800 mb-2">Something went wrong</p>
            <p className="text-sm text-warm-500 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-primary px-6 py-3 text-cream font-bold text-sm
                         hover:bg-primary-hover active:scale-[0.97] transition-all
                         shadow-md shadow-primary/15 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
