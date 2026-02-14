import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "sans-serif" }}>
          <h2>Une erreur est survenue</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "#b91c1c", fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: "8px 20px", cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
