enum State {
    'pending',
    'fulfilled',
    'rejected',
}
interface Thenable {
    then: (onFulfillment?: () => Promise<any>, onRejection?: () => Promise<any>) => {}
}

module.exports = class Promise<T> {
    _state: State = State.pending
    _handled: boolean = false
    _executorCbCalled: boolean = false
    _subscribers: Promise<any>[] = []
    _value: any
    onFulfillment: null | ((value: any) => any) = null
    onRejection: null | ((error: any) => any) = null
    constructor(
        executor: (resolve: (value: [Promise<any> | Thenable | any]) => void, reject: (reason: any) => void) => void
    ) {
        executor(this._resolveHandler.bind(this), this._rejectHandler.bind(this))
    }

    _resolveHandler(value: [Promise<any> | Thenable | any]) {
        if (this._executorCbCalled) return
        else {
            this._executorCbCalled = true
        }
        this._value = value
        this._handled = true
        this._state = State.fulfilled
        this._runSubscribers()
    }

    _rejectHandler(reason: any) {
        if (this._executorCbCalled) return
        else {
            this._executorCbCalled = true
        }
        this._value = reason
        this._handled = true
        this._state = State.rejected
        this._runSubscribers()
    }

    _runSubscriber(subscriber: Promise<any>): void {
        const cb = this._state === State.fulfilled ? subscriber.onFulfillment : subscriber.onRejection
        let value
        if (cb === null) {
        } // resolve then(null, null)
        else {
            value = cb(this._value)
        }
        // call subscriber
    }

    _runSubscribers(): void {
        if (this._handled) {
            if (this._subscribers.length > 0) {
                for (let subscriber of this._subscribers) {
                    this._runSubscriber(subscriber)
                }
            }
            this._subscribers = []
        }
    }

    then(onFulfillment: () => void, onRejection: () => void) {
        let subscriber = new Promise(() => {})
        subscriber.onFulfillment = typeof onFulfillment === 'function' ? onFulfillment : null
        subscriber.onRejection = typeof onRejection === 'function' ? onRejection : null
        typeof onRejection === 'function' ? onRejection : null
        if (this._handled) {
            this._runSubscriber(subscriber)
        } else {
            // subscribe
            this._subscribers.push(subscriber)
        }
        return subscriber
    }

    static resolve() {}

    static reject() {}
}
