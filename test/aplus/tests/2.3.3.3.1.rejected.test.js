'use strict'

var assert = require('node:assert')
var thenables = require('./helpers/thenables')
var reasons = require('./helpers/reasons')

var adapter = require('../../adapter')
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

function testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, fulfillmentValue) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {
        promise.then(function onPromiseFulfilled(value) {
            assert.strictEqual(value, fulfillmentValue)
            done()
        })
    })
}

function testCallingResolvePromiseRejectsWith(yFactory, stringRepresentation, rejectionReason) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {
        promise.then(null, function onPromiseRejected(reason) {
            assert.strictEqual(reason, rejectionReason)
            done()
        })
    })
}

describe(
    '2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and ' +
        'second argument `rejectPromise`',
    function () {
        describe('2.3.3.3.1: If/when `resolvePromise` is called with value `y`, run `[[Resolve]](promise, y)`', function () {
            describe('`y` is a thenable for a thenable', function () {
                Object.keys(thenables.fulfilled).forEach(function (outerStringRepresentation) {
                    var outerThenableFactory = thenables.fulfilled[outerStringRepresentation]

                    Object.keys(thenables.rejected).forEach(function (innerStringRepresentation) {
                        var innerThenableFactory = thenables.rejected[innerStringRepresentation]

                        var stringRepresentation = outerStringRepresentation + ' for ' + innerStringRepresentation

                        function yFactory() {
                            return outerThenableFactory(innerThenableFactory(sentinel))
                        }

                        testCallingResolvePromiseRejectsWith(yFactory, stringRepresentation, sentinel)
                    })
                })
            })
        })
    }
)