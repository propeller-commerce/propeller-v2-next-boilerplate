"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComposableStore = void 0;
class ComposableStore {
    constructor(initialState) {
        this.listeners = new Set();
        this.getState = () => {
            return this.state;
        };
        this.subscribe = (listener) => {
            this.listeners.add(listener);
            return () => {
                this.listeners.delete(listener);
            };
        };
        this.state = initialState;
    }
    setState(partial) {
        this.state = { ...this.state, ...partial };
        this.notify();
    }
    notify() {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
exports.ComposableStore = ComposableStore;
//# sourceMappingURL=ComposableStore.js.map