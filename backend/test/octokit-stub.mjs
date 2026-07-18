// Shared mutable holder so tests can inject a fake Octokit instance.
export const kitHolder = { kit: null };

// Return a Proxy that always delegates to the current kitHolder.kit. This
// survives getRepositoryClient()'s module-level caching: even a cached
// instance keeps forwarding to whatever kit the active test installed.
export class Octokit {
    constructor() {
        return new Proxy(
            {},
            {
                get: (_target, prop) => kitHolder.kit[prop],
            }
        );
    }
}
