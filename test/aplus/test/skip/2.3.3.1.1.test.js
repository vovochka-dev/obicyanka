'use strict'

var assert = require('node:assert')

var adapter = require('../../../adapter')
var resolved = adapter.resolved
var rejected = adapter.rejected

var dummy = { dummy: 'dummy' } // we fulfill or reject with this when we don't intend to test against it

function testPromiseResolution(xFactory, test) {
    specify('via return from a fulfilled promise', function (done) {
        var promise = resolved(dummy).then(function onBasePromiseFulfilled() {
            return xFactory()
        })

        test(promise, done)
    })

    specify('via return from a rejected promise', function (done) {
        var promise = rejected(dummy).then(null, function onBasePromiseRejected() {
            return xFactory()
        })

        test(promise, done)
    })
}

describe('2.3.3: Otherwise, if `x` is an object or function,', function () {
    describe('2.3.3.1: Let `then` be `x.then`', function () {
        describe('`x` is an object with null prototype', function () {
            var numberOfTimesThenWasRetrieved = null

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0
            })

            function xFactory() {
                return Object.create(null, {
                    then: {
                        get: function () {
                            ++numberOfTimesThenWasRetrieved
                            return function thenMethodForX(onFulfilled) {
                                onFulfilled()
                            }
                        },
                    },
                })
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function () {
                    assert.strictEqual(numberOfTimesThenWasRetrieved, 1)
                    done()
                })
            })
        })

        describe('`x` is an object with normal Object.prototype', function () {
            var numberOfTimesThenWasRetrieved = null

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0
            })

            function xFactory() {
                return Object.create(Object.prototype, {
                    then: {
                        get: function () {
                            ++numberOfTimesThenWasRetrieved
                            return function thenMethodForX(onFulfilled) {
                                onFulfilled()
                            }
                        },
                    },
                })
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function () {
                    assert.strictEqual(numberOfTimesThenWasRetrieved, 1)
                    done()
                })
            })
        })

        describe('`x` is a function', function () {
            var numberOfTimesThenWasRetrieved = null

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0
            })

            function xFactory() {
                function x() {}

                Object.defineProperty(x, 'then', {
                    get: function () {
                        ++numberOfTimesThenWasRetrieved
                        return function thenMethodForX(onFulfilled) {
                            onFulfilled()
                        }
                    },
                })

                return x
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function () {
                    assert.strictEqual(numberOfTimesThenWasRetrieved, 1)
                    done()
                })
            })
        })
    })
})
