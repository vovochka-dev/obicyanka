let assert = require('node:assert')
let adapter = require('./adapter')

describe('executor', function () {
    it('should be called', function () {
        let called = false
        new adapter.Promise(() => {
            called = true
        })
        assert.strictEqual(called, true)
    })
})
