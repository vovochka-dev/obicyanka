var Promise = require('../src/index.js')
//let Promise = require('promise-polyfill')

let deferred = function () {
    let resolve
    let reject
    let promise = new Promise(function (res, rej) {
        resolve = res
        reject = rej
    })
    return {
        promise,
        resolve,
        reject,
    }
}

let resolved = function (value) {
    let d = deferred()
    d.resolve(value)
    return d.promise
}

let rejected = function (reason) {
    let d = deferred()
    d.reject(reason)
    return d.promise
}

module.exports = {
    deferred,
    resolved,
    rejected,
}
