# Documentation

## Notes

### TypeScript Express Request Extension Issue

We encountered a TypeScript compilation issue when trying to extend the Express Request object to include a `user` property for authentication purposes.

#### Problem
- We needed to extend the Express Request interface to include a `user` property with an `id` field
- Created a global type declaration file (`src/types/global.d.ts`) to extend the Express Request interface
- TypeScript compiler (`tsc`) was correctly detecting the extended `user` attribute on the request object
- However, when running `npm run dev` with ts-node, we encountered runtime errors where TypeScript was saying `req.user` is invalid because ts-node was not detecting the extended interface

#### Error Details
```
error TS2339: Property 'user' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
```

#### Solution Implemented
We used **triple-slash directives** as a workaround. This approach involves:

1. **Triple-slash directive**: Added `/// <reference path="./types/global.d.ts" />` at the top of `src/main.ts`
2. **Type declaration file**: Created `src/types/global.d.ts` with the Express interface extension
3. **No direct imports**: Avoided importing `.d.ts` files directly as modules

#### Alternative Solutions
There are several other workarounds for this issue:

1. **ts-node configuration**: Add `"ts-node": { "files": true }` inside `tsconfig.json`
2. **typeRoots configuration**: Added `"typeRoots": ["./node_modules/@types", "./src/types"]` inside tsconfig.json This didn't work
3. **Module augmentation**: Use different module augmentation patterns
4. **Direct imports**: Import type files as modules (not recommended for `.d.ts` files)

#### Why Triple-slash Directives?
- **Preference for minimal configuration changes**: Avoids modifying compiler options
- **No structural changes needed**: Doesn't require restructuring type definitions
- **Explicit reference**: Makes the type dependency explicit in the main entry point
- **ts-node compatibility**: Works well with ts-node without additional configuration

This approach ensures that the `user` property is properly typed throughout the application while maintaining compatibility with both `tsc` and `ts-node`.
