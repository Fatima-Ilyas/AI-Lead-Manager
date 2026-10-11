import { Component } from "react";
import { RefreshCw } from "lucide-react";
import { Button, EmptyState } from "./ui";

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="panel" role="alert">
          <EmptyState
            title="Let’s give this screen a fresh start"
            description="Something interrupted the workspace. Refresh the page to try again."
          >
            <Button icon={RefreshCw} onClick={() => window.location.reload()}>
              Refresh workspace
            </Button>
          </EmptyState>
        </section>
      );
    return this.props.children;
  }
}
