type Listener = () => void;
export declare class ComposableStore<TState extends object> {
    private state;
    private listeners;
    constructor(initialState: TState);
    getState: () => TState;
    setState(partial: Partial<TState>): void;
    subscribe: (listener: Listener) => (() => void);
    private notify;
}
export {};
//# sourceMappingURL=ComposableStore.d.ts.map