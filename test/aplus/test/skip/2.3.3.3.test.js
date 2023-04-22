'use strict'

var assert = require('node:assert')
var reasons = require('../helpers/reasons')

var adapter = require('../../../adapter')
var resolved = adapter.resolved
var rejected = adapter.rejected
var deferred = adapter.deferred

var dummy = { dummy: 'dummy' } // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: 'sentinel' } // a sentinel fulfillment value to test for with strict equality
var other = { other: 'other' } // a value we don't want to be strict equal to

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

function testCallingRejectPromiseRejectsWith(reason, stringRepresentation) {
    testCallingRejectPromise(reason, stringRepresentation, function (promise, done) {
        promise.then(null, function onPromiseRejected(rejectionReason) {
            assert.strictEqual(rejectionReason, reason)
            done()
        })
    })
}

describe(
    '2.3.3.3: If `then` is a function, call it with `x` as `this`, first argument `resolvePromise`, and ' +
        'second argument `rejectPromise`',
    function () {
        describe('Calls with `x` as `this` and two function arguments', function () {
            function xFactory() {
                var x = {
                    then: function (onFulfilled, onRejected) {
                        assert.strictEqual(this, x)
                        assert.strictEqual(typeof onFulfilled, 'function')
                        assert.strictEqual(typeof onRejected, 'function')
                        onFulfilled()
                    },
                }
                return x
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function () {
                    done()
                })
            })
        })

        describe('Uses the original value of `then`', function () {
            var numberOfTimesThenWasRetrieved = null

            beforeEach(function () {
                numberOfTimesThenWasRetrieved = 0
            })

            function xFactory() {
                return Object.create(Object.prototype, {
                    then: {
                        get: function () {
                            if (numberOfTimesThenWasRetrieved === 0) {
                                return function (onFulfilled) {
                                    onFulfilled()
                                }
                            }
                            return null
                        },
                    },
                })
            }

            testPromiseResolution(xFactory, function (promise, done) {
                promise.then(function () {
                    done()
                })
            })
        })

        describe('2.3.3.3.2: If/when `rejectPromise` is called with reason `r`, reject `promise` with `r`', function () {
            Object.keys(reasons).forEach(function (stringRepresentation) {
                testCallingRejectPromiseRejectsWith(reasons[stringRepresentation](), stringRepresentation)
            })
        })

        describe(
            '2.3.3.3.3: If both `resolvePromise` and `rejectPromise` are called, or multiple calls to the same ' +
                'argument are made, the first call takes precedence, and any further calls are ignored.',
            function () {
                describe('calling `resolvePromise` then `rejectPromise`, both synchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                resolvePromise(sentinel)
                                rejectPromise(other)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `resolvePromise` synchronously then `rejectPromise` asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                resolvePromise(sentinel)

                                setTimeout(function () {
                                    rejectPromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `resolvePromise` then `rejectPromise`, both asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                setTimeout(function () {
                                    resolvePromise(sentinel)
                                }, 0)

                                setTimeout(function () {
                                    rejectPromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe(
                    'calling `resolvePromise` with an asynchronously-fulfilled promise, then calling ' +
                        '`rejectPromise`, both synchronously',
                    function () {
                        function xFactory() {
                            var d = deferred()
                            setTimeout(function () {
                                d.resolve(sentinel)
                            }, 50)

                            return {
                                then: function (resolvePromise, rejectPromise) {
                                    resolvePromise(d.promise)
                                    rejectPromise(other)
                                },
                            }
                        }

                        testPromiseResolution(xFactory, function (promise, done) {
                            promise.then(function (value) {
                                assert.strictEqual(value, sentinel)
                                done()
                            })
                        })
                    }
                )

                describe(
                    'calling `resolvePromise` with an asynchronously-rejected promise, then calling ' +
                        '`rejectPromise`, both synchronously',
                    function () {
                        function xFactory() {
                            var d = deferred()
                            setTimeout(function () {
                                d.reject(sentinel)
                            }, 50)

                            return {
                                then: function (resolvePromise, rejectPromise) {
                                    resolvePromise(d.promise)
                                    rejectPromise(other)
                                },
                            }
                        }

                        testPromiseResolution(xFactory, function (promise, done) {
                            promise.then(null, function (reason) {
                                assert.strictEqual(reason, sentinel)
                                done()
                            })
                        })
                    }
                )

                describe('calling `rejectPromise` then `resolvePromise`, both synchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel)
                                resolvePromise(other)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `rejectPromise` synchronously then `resolvePromise` asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel)

                                setTimeout(function () {
                                    resolvePromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `rejectPromise` then `resolvePromise`, both asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                setTimeout(function () {
                                    rejectPromise(sentinel)
                                }, 0)

                                setTimeout(function () {
                                    resolvePromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `resolvePromise` twice synchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                resolvePromise(sentinel)
                                resolvePromise(other)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `resolvePromise` twice, first synchronously then asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                resolvePromise(sentinel)

                                setTimeout(function () {
                                    resolvePromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `resolvePromise` twice, both times asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                setTimeout(function () {
                                    resolvePromise(sentinel)
                                }, 0)

                                setTimeout(function () {
                                    resolvePromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe(
                    'calling `resolvePromise` with an asynchronously-fulfilled promise, then calling it again, both ' +
                        'times synchronously',
                    function () {
                        function xFactory() {
                            var d = deferred()
                            setTimeout(function () {
                                d.resolve(sentinel)
                            }, 50)

                            return {
                                then: function (resolvePromise) {
                                    resolvePromise(d.promise)
                                    resolvePromise(other)
                                },
                            }
                        }

                        testPromiseResolution(xFactory, function (promise, done) {
                            promise.then(function (value) {
                                assert.strictEqual(value, sentinel)
                                done()
                            })
                        })
                    }
                )

                describe(
                    'calling `resolvePromise` with an asynchronously-rejected promise, then calling it again, both ' +
                        'times synchronously',
                    function () {
                        function xFactory() {
                            var d = deferred()
                            setTimeout(function () {
                                d.reject(sentinel)
                            }, 50)

                            return {
                                then: function (resolvePromise) {
                                    resolvePromise(d.promise)
                                    resolvePromise(other)
                                },
                            }
                        }

                        testPromiseResolution(xFactory, function (promise, done) {
                            promise.then(null, function (reason) {
                                assert.strictEqual(reason, sentinel)
                                done()
                            })
                        })
                    }
                )

                describe('calling `rejectPromise` twice synchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel)
                                rejectPromise(other)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `rejectPromise` twice, first synchronously then asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel)

                                setTimeout(function () {
                                    rejectPromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('calling `rejectPromise` twice, both times asynchronously', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                setTimeout(function () {
                                    rejectPromise(sentinel)
                                }, 0)

                                setTimeout(function () {
                                    rejectPromise(other)
                                }, 0)
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('saving and abusing `resolvePromise` and `rejectPromise`', function () {
                    var savedResolvePromise, savedRejectPromise

                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                savedResolvePromise = resolvePromise
                                savedRejectPromise = rejectPromise
                            },
                        }
                    }

                    beforeEach(function () {
                        savedResolvePromise = null
                        savedRejectPromise = null
                    })

                    testPromiseResolution(xFactory, function (promise, done) {
                        var timesFulfilled = 0
                        var timesRejected = 0

                        promise.then(
                            function () {
                                ++timesFulfilled
                            },
                            function () {
                                ++timesRejected
                            }
                        )

                        if (savedResolvePromise && savedRejectPromise) {
                            savedResolvePromise(dummy)
                            savedResolvePromise(dummy)
                            savedRejectPromise(dummy)
                            savedRejectPromise(dummy)
                        }

                        setTimeout(function () {
                            savedResolvePromise(dummy)
                            savedResolvePromise(dummy)
                            savedRejectPromise(dummy)
                            savedRejectPromise(dummy)
                        }, 50)

                        setTimeout(function () {
                            assert.strictEqual(timesFulfilled, 1)
                            assert.strictEqual(timesRejected, 0)
                            done()
                        }, 100)
                    })
                })
            }
        )

        describe('2.3.3.3.4: If calling `then` throws an exception `e`,', function () {
            describe('2.3.3.3.4.1: If `resolvePromise` or `rejectPromise` have been called, ignore it.', function () {
                describe('`resolvePromise` was called with a non-thenable', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                resolvePromise(sentinel)
                                throw other
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('`resolvePromise` was called with an asynchronously-fulfilled promise', function () {
                    function xFactory() {
                        var d = deferred()
                        setTimeout(function () {
                            d.resolve(sentinel)
                        }, 50)

                        return {
                            then: function (resolvePromise) {
                                resolvePromise(d.promise)
                                throw other
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('`resolvePromise` was called with an asynchronously-rejected promise', function () {
                    function xFactory() {
                        var d = deferred()
                        setTimeout(function () {
                            d.reject(sentinel)
                        }, 50)

                        return {
                            then: function (resolvePromise) {
                                resolvePromise(d.promise)
                                throw other
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('`rejectPromise` was called', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel)
                                throw other
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('`resolvePromise` then `rejectPromise` were called', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                resolvePromise(sentinel)
                                rejectPromise(other)
                                throw other
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(function (value) {
                            assert.strictEqual(value, sentinel)
                            done()
                        })
                    })
                })

                describe('`rejectPromise` then `resolvePromise` were called', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                rejectPromise(sentinel)
                                resolvePromise(other)
                                throw other
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })
            })

            describe('2.3.3.3.4.2: Otherwise, reject `promise` with `e` as the reason.', function () {
                describe('straightforward case', function () {
                    function xFactory() {
                        return {
                            then: function () {
                                throw sentinel
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('`resolvePromise` is called asynchronously before the `throw`', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise) {
                                setTimeout(function () {
                                    resolvePromise(other)
                                }, 0)
                                throw sentinel
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })

                describe('`rejectPromise` is called asynchronously before the `throw`', function () {
                    function xFactory() {
                        return {
                            then: function (resolvePromise, rejectPromise) {
                                setTimeout(function () {
                                    rejectPromise(other)
                                }, 0)
                                throw sentinel
                            },
                        }
                    }

                    testPromiseResolution(xFactory, function (promise, done) {
                        promise.then(null, function (reason) {
                            assert.strictEqual(reason, sentinel)
                            done()
                        })
                    })
                })
            })
        })
    }
)
