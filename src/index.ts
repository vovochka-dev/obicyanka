enum State {
    'pending',
    'fulfilled',
    'rejected',
}
interface Thenable {
    then: (resolve: (value: Promise<any> | Thenable | any) => void, reject: (reason: any) => void) => {}
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
        executor: (resolve: (value: Promise<any> | Thenable | any) => void, reject: (reason: any) => void) => void
    ) {
        executor(this._resolveHandler.bind(this), this._rejectHandler.bind(this))
    }

    _resolveHandler(value: Promise<any> | Thenable | any) {
        if (this._executorCbCalled) return
        else this._executorCbCalled = true

        const isThenable = (element: unknown): element is Thenable => {
            return (
                typeof element === 'object' &&
                element !== null &&
                'then' in element &&
                typeof element.then === 'function'
            )
        }
        try {
            if (value instanceof Promise) {
                this._value = value
                this._state = State.fulfilled
                this._handled = false
                return
            } else if (isThenable(value)) {
                this._handled = true
                this._value = new Promise(value.then.bind(value))
                this._state = State.fulfilled
                this._handled = false
                return
            }
            this._value = value
            this._handled = true
            this._state = State.fulfilled
            this._runSubscribers()
        } catch (e) {
            this._rejectHandler(e)
        }
    }

    _rejectHandler(reason: any) {
        if (this._executorCbCalled) return
        else {
            this._executorCbCalled = true
        }
        let self = this
        this._value = reason
        this._handled = true
        this._state = State.rejected
        if (this._state === State.rejected && this._subscribers.length === 0) {
            setImmediate(function () {
                if (!self._handled) {
                    console.warn('Possible Unhandled Promise Rejection:', self._value)
                }
            })
        }
        this._runSubscribers()
    }

    _runSubscriber(subscriber: Promise<any>): void {
        const self = this
        setImmediate(function () {
            let cb = self._state === State.fulfilled ? subscriber.onFulfillment : subscriber.onRejection
            let value
            if (cb === null) {
                if (self._state === State.fulfilled) {
                    subscriber._resolveHandler.bind(subscriber)(self._value)
                } else {
                    subscriber._rejectHandler.bind(subscriber)(self._value)
                }
                return
            } else {
                value = cb(self._value)
            }
        })
    }

    _runSubscribers(): void {
        function getDeepestPromise(promise: Promise<any>) {
            while (promise._state === State.pending && promise._handled) {
                promise = promise._value
            }
            return promise
        }
        const deepestPromise = getDeepestPromise(this)
        if (this._handled) {
            if (deepestPromise._subscribers.length > 0) {
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
