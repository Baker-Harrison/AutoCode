import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled error in UI", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-zed-bg">
          <div className="space-y-4 rounded-md border border-zed-border bg-zed-panel p-6 text-center">
            <div className="text-sm font-semibold text-zed-text">Something went wrong</div>
            <div className="text-xs text-zed-text-muted">
              Try reloading the app. If this persists, check the logs.
            </div>
            <Button onClick={this.handleReload} variant="secondary">
              Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
