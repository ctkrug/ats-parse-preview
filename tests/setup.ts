/**
 * Test-environment shims.
 *
 * pdf.js 4.x calls Promise.withResolvers, which every browser we target has but
 * Node 20 does not (it landed in Node 22). Polyfilling here keeps the shim out
 * of the app bundle, where it would be dead weight.
 */
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
