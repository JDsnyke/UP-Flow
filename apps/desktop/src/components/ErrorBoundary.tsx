import type { ReactNode } from "react";
import { Component } from "react";
import { Button, Card } from "./ui";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string | null;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error("Unhandled UI error", error);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <Card className="max-w-xl text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-[var(--up-muted)]">
            {this.state.message ?? "An unexpected error occurred."}
          </p>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>Reload app</Button>
          </div>
        </Card>
      </div>
    );
  }
}
