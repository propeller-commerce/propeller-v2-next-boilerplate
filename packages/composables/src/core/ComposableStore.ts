type Listener = () => void;

export class ComposableStore<TState extends object> {
  private state: TState;
  private listeners: Set<Listener> = new Set();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState = (): TState => {
    return this.state;
  };

  setState(partial: Partial<TState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
