# fdc3-web

![Lifecycle Incubating](https://badgen.net/badge/Lifecycle/Incubating/yellow)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://github.com/morganstanley/fdc3-web/actions/workflows/build.yml/badge.svg)](https://github.com/morganstanley/fdc3-web/actions/workflows/build.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/morganstanley/fdc3-web/badge)](https://securityscorecards.dev/viewer/?uri=github.com/morganstanley/fdc3-web)

## Installation

```
npm install @morgan-stanley/fdc3-web
npm install @morgan-stanley/fdc3-web-ui-provider
npm install @morgan-stanley/fdc3-web-messaging-provider
```

# Development Notes

* `lib` - The actual implementation of the fdc3 code. This library will be published for use in other applications.
* `messaging-provider` - A messaging provider for the fdc3 library. This is an implementation of the messaging-provider interface that provides communications between frames and windows, including in other domains. This will be published for use in other applications.
* `ui-provider` - A UI provider for the fdc3 library. This provides a Resolver and Channel Selector. This will be published for use in other applications.
* `finos` - A Finos provider for the fdc3 library that contains types not currently available in the @finos/fdc3 library.
* `test-harness` - A Lit app for testing local messaging between different apps working in the same context. Will depend on `lib`.

For most development running `npm start` will be sufficient to test implementation and cross-frame / cross origin communication. This will build and run `test-harness`. 

## Commands

```typescript

npm install // Install all package dependencies

npm run build // Run a simple build

npm run test // Run tests on the command line

npm run lint // Checks the code for lint errors

npm run build-release // Run a full build (Compile, Tests, Lint)

```
## Development setup

We recommend using VSCode for the best development experience. We also recommend installing the following extensions
* ESLint
* Code Spell Checker

 If you wish to use another editors there are no known restrictions.
