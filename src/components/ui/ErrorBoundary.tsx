import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { resetDemoData } from '@/data/storage';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  showResetConfirm: boolean;
  isResetting: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    showResetConfirm: false,
    isResetting: false,
  };

  public static getDerivedStateFromError(_: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error and component stack to console only; never display stack trace in UI
    console.error('ErrorBoundary caught error:', error, errorInfo?.componentStack);
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined' && window.location) {
      try {
        window.location.reload();
      } catch {
        // Fallback for test environments
      }
    }
  };

  private handleConfirmReset = async (): Promise<void> => {
    this.setState({ isResetting: true });
    try {
      await resetDemoData('Error Boundary Recovery');
      if (this.props.onReset) {
        this.props.onReset();
      }
      this.setState({ hasError: false, showResetConfirm: false });
      if (typeof window !== 'undefined' && window.location) {
        try {
          window.location.reload();
        } catch {
          // Fallback for test environments
        }
      }
    } catch (err) {
      console.error('Failed to reset demo data:', err);
    } finally {
      this.setState({ isResetting: false, showResetConfirm: false });
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 space-y-4">
          <p className="text-sm font-medium">Something went wrong on this page.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReload}
            >
              Reload page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ showResetConfirm: true })}
            >
              Reset demo data
            </Button>
          </div>

          <Modal
            isOpen={this.state.showResetConfirm}
            title="Reset demo data"
            onClose={() => this.setState({ showResetConfirm: false })}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                This will restore all clinic data to its initial demonstration state. Any unsaved changes will be lost.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => this.setState({ showResetConfirm: false })}
                  disabled={this.state.isResetting}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleConfirmReset}
                  disabled={this.state.isResetting}
                >
                  Confirm reset
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      );
    }

    return this.props.children;
  }
}
