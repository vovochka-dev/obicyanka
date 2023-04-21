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
    _subscribers: Promise<any>[] = []
    _value: any
    onFulfillment: null | ((value: any) => any) = null
    onRejection: null | ((error: any) => any) = null
    constructor(
        executor: (resolve: (value: Promise<any> | Thenable | any) => void, reject: (reason: any) => void) => void
    ) {
        this.runExecutor(executor)
    }

    runExecutor(
        executor: (resolve: (value: Promise<any> | Thenable | any) => void, reject: (reason: any) => void) => void
    ) {
        let done = false
        try {
            executor(
                (value) => {
                    if (done) return
                    done = true
                    this._resolveHandler(value)
                },
                (reason) => {
                    if (done) return
                    done = true
                    this._rejectHandler(reason)
                }
            )
        } catch (ex) {
            if (done) return
            done = true
            this._rejectHandler(ex)
        }
    }
    _resolveHandler(value: Promise<any> | Thenable | any) {
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

    _runSubscriber(subscriber: Promise<any>) {
        const self = this
        self._handled = true
        setImmediate(function () {
            let cb = self._state === State.fulfilled ? subscriber.onFulfillment : subscriber.onRejection

            if (cb === null) {
                if (self._state === State.fulfilled) cb = subscriber._resolveHandler
                else cb = subscriber._rejectHandler
                cb.bind(subscriber)(self._value)
                return
            }
            let value
            try {
                value = cb(self._value)
            } catch (e) {
                subscriber._rejectHandler(e)
                return
            }
            subscriber._resolveHandler(value)
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

    _getDeepestPromise() {
        let promise = this
        while (promise._state === State.pending && promise._handled) {
            // @ts-ignore: Unreachable code error
            promise = promise._value // as this
        }
        return promise
    }

    handle(subscriber: Promise<any>) {
        let promise = this._getDeepestPromise()
        if (promise._state === State.pending) {
            // promise not resolved, so subscribe subscriber to the deepest promise
            promise._subscribers.push(subscriber)
        } else {
            promise._runSubscriber(subscriber) // promise already resolved.
        }
    }

    then(onFulfillment: () => void, onRejection: () => void) {
        let subscriber = new Promise(() => {})
        subscriber.onFulfillment = typeof onFulfillment === 'function' ? onFulfillment : null
        subscriber.onRejection = typeof onRejection === 'function' ? onRejection : null
        typeof onRejection === 'function' ? onRejection : null
        this.handle(subscriber)
        return subscriber
    }

    resolve(value: any) {
        if (value && typeof value === 'object' && value.constructor === Promise) {
            return value
        }

        return new Promise(function (resolve) {
            resolve(value)
        })
    }

    reject(value: any) {
        return new Promise(function (resolve, reject) {
            reject(value)
        })
    }
}
