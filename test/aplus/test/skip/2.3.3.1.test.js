'use strict'

var assert = require('node:assert')
var thenables = require('../helpers/thenables')
var reasons = require('../helpers/reasons')

var adapter = require('../../../adapter')
var resolved = adapter.resolved
var rejected = adapter.rejected
var deferred = adapter.deferred

var dummy = { dummy: 'dummy' } // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: 'sentinel' } // a sentinel fulfillment value to test for with strict equality
var other = { other: 'other' } // a value we don't want to be strict equal to
var sentinelArray = [sentinel] // a sentinel fulfillment value to test when we need an array

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

function testCallingResolvePromise(yFactory, stringRepresentation, test) {
    describe('`y` is ' + stringRepresentation, function () {
        describe('`then` calls `resolvePromise` synchronously', function () {
            function xFactory() {
                return {
                    then: function (resolvePromise) {
                        resolvePromise(yFactory())
                    },
                }
            }

            testPromiseResolution(xFactory, test)
        })

        describe('`then` calls `resolvePromise` asynchronously', function () {
            function xFactory() {
                return {
                    then: function (resolvePromise) {
                        setTimeout(function () {
                            resolvePromise(yFactory())
                        }, 0)
                    },
                }
            }

            testPromiseResolution(xFactory, test)
        })
    })
}

function testCallingRejectPromise(r, stringRepresentation, test) {
    describe('`r` is ' + stringRepresentation, function () {
        describe('`then` calls `rejectPromise` synchronously', function () {
            function xFactory() {
                return {
                    then: function (resolvePromise, rejectPromise) {
                        rejectPromise(r)
                    },
                }
            }

            testPromiseResolution(xFactory, test)
        })

        describe('`then` calls `rejectPromise` asynchronously', function () {
            function xFactory() {
                return {
                    then: function (resolvePromise, rejectPromise) {
                        setTimeout(function () {
                            rejectPromise(r)
                        }, 0)
                    },
                }
            }

            testPromiseResolution(xFactory, test)
        })
    })
}

describe('2.3.3: Otherwise, if `x` is an object or function,', function () {
    describe(
        '2.3.3.2: If retrieving the property `x.then` results in a thrown exception `e`, reject `promise` with ' +
            '`e` as the reason.',
        function () {
            function testRejectionViaThrowingGetter(e, stringRepresentation) {
                function xFactory() {
                    return Object.create(Object.prototype, {
                        then: {
                            get: function () {
                                throw e
                            },
                        },
                    })
                }

                describe('`e` is ' + stringRepresentation, function () {
                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, e)
                            done()
                        })
                    })
                })
            }

            Object.keys(reasons).forEach(function (stringRepresentation) {
                testRejectionViaThrowingGetter(reasons[stringRepresentation], stringRepresentation)
            })
        }
    )

    describe('2.3.3.4: If `then` is not a function, fulfill promise with `x`', function () {
        function testFulfillViaNonFunction(then, stringRepresentation) {
            var x = null

            beforeEach(function () {
                x = { then: then }
            })

            function xFactory() {
                return x
            }

            describe('`then` is ' + stringRepresentation, function () {
                testPromiseResolution(xFactory, function (promise, done) {
                    promise.then(function (value) {
                        assert.strictEqual(value, x)
                        done()
                    })
                })
            })
        }

        testFulfillViaNonFunction(5, '`5`')
        testFulfillViaNonFunction({}, 'an object')
        testFulfillViaNonFunction([function () {}], 'an array containing a function')
        testFulfillViaNonFunction(/a-b/i, 'a regular expression')
        testFulfillViaNonFunction(Object.create(Function.prototype), 'an object inheriting from `Function.prototype`')
    })
})