import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for dev visibility
    console.error("App ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro ao renderizar a interface. Você pode tentar atualizar a página.
            </p>
            <button onClick={this.handleReset} className="px-4 py-2 rounded bg-primary text-primary-foreground">
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;