module.exports = class Promise<T> {
    constructor(executor: (resolve: () => void, reject: () => void) => void) {
        executor(this.onResolve, this.onReject)
    }
    onResolve() {}
    onReject() {}
    static resolve() {}
    static reject() {}
}
