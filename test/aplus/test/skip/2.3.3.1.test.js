'use strict'

var assert = require('node:assert')
var reasons = require('../helpers/reasons')

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
