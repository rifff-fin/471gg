import { Component } from "react";

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="site-shell error-boundary">
          <h1>We could not display this page.</h1>
          <p>
            Please refresh the page. If this continues, return to the community
            feed.
          </p>
          <a className="button button--primary" href="/">
            Back to reports
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
