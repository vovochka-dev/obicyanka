const promiseFinally = require('./finally')
const allSettled = require('./allSettled')
const any = require('./any')

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
        if (!(this instanceof Promise)) throw new TypeError('Promises must be constructed via new')
        if (typeof executor !== 'function') throw new TypeError('not a function')
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
        } catch (e) {
            if (done) return
            done = true
            this._rejectHandler(e)
        }
    }

    _resolveHandler(value: Promise<any> | Thenable | any) {
        try {
            if (value === this) throw new TypeError('A promise cannot be resolved with itself.')
            const then = value.then
            if (value instanceof Promise) {
                this._value = value
                this._handled = true
                this._handleSubscribers()
                return
            } else if (typeof then === 'function') {
                this._handled = true
                this._value = new Promise(then.bind(value))
                this._handleSubscribers()
                return
            }
            this._value = value
            this._handled = true
            this._state = State.fulfilled
            this._handleSubscribers()
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
        this._handleSubscribers()
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

    _handleSubscribers() {
        for (let subscriber of this._subscribers) {
            this.handle(subscriber)
        }
        this._subscribers = []
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

    then(onFulfillment: null | (() => void), onRejection: () => void) {
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

    catch(onRejected: any) {
        return this.then(null, onRejected)
    }
    all(arr: Array<any>) {
        return new Promise(function (resolve, reject) {
            if (!Array.isArray(arr)) {
                return reject(new TypeError('Promise.all accepts an array'))
            }

            let args = Array.prototype.slice.call(arr)
            if (args.length === 0) return resolve([])
            let remaining = args.length

            function res(i: number, val: any) {
                try {
                    if (val && (typeof val === 'object' || typeof val === 'function')) {
                        let then = val.then
                        if (typeof then === 'function') {
                            then.call(
                                val,
                                function (val: any) {
                                    res(i, val)
                                },
                                reject
                            )
                            return
                        }
                    }
                    args[i] = val
                    if (--remaining === 0) {
                        resolve(args)
                    }
                } catch (ex) {
                    reject(ex)
                }
            }

            for (let i = 0; i < args.length; i++) {
                res(i, args[i])
            }
        })
    }

    any(arr: Promise<any>[]) {
        return any(arr)
    }
}

Promise.prototype['finally'] = promiseFinally

Promise.allSettled = allSettled

Promise.race = function (arr: Promise<any>[]) {
    return new Promise(function (resolve, reject) {
        if (!Array.isArray(arr)) {
            return reject(new TypeError('Promise.race accepts an array'))
        }

        for (let i = 0, len = arr.length; i < len; i++) {
            Promise.resolve(arr[i]).then(resolve, reject)
        }
    })
}
