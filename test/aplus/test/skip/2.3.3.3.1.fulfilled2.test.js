'use strict'

var assert = require('node:assert')
var thenables = require('../helpers/thenables')

let thenablesFulfilledHalf2 = {
    'a thenable that fulfills but then throws': thenables.fulfilled['a thenable that fulfills but then throws'],
    'an already-fulfilled promise': thenables.fulfilled['an already-fulfilled promise'],
    'an eventually-fulfilled promise': thenables.fulfilled['an eventually-fulfilled promise'],
}

var adapter = require('../../../adapter')
var resolved = adapter.resolved
var rejected = adapter.rejected

var dummy = { dummy: 'dummy' } // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: 'sentinel' } // a sentinel fulfillment value to test for with strict equality

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

function testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, fulfillmentValue) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {
        promise.then(function onPromiseFulfilled(value) {
            assert.strictEqual(value, fulfillmentValue)
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

                    Object.keys(thenablesFulfilledHalf2).forEach(function (innerStringRepresentation) {
                        var innerThenableFactory = thenables.fulfilled[innerStringRepresentation]

                        var stringRepresentation = outerStringRepresentation + ' for ' + innerStringRepresentation

                        function yFactory() {
                            return outerThenableFactory(innerThenableFactory(sentinel))
                        }

                        testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, sentinel)
                    })
                })
            })
        })
    }
)
