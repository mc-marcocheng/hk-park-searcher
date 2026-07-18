const STUB = new URL("./octokit-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
    if (specifier === "@octokit/rest") {
        return {
            url: STUB,
            shortCircuit: true,
        };
    }
    return nextResolve(specifier, context);
}
