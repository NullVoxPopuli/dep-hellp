# dep hellp 



It's all too common that your `node_modules` folder ends up with a structure that doesn't satisfy every package's stated dependencies. This tool lets you check for that and guides you through to fix the reported problems.

## Usage

```bash 
npx dephellp
```

## Notes


_This is a fork of [are-my-node-modules-messed-up](https://github.com/ef4/are-my-node-modules-messed-up/)_, with some extra features (like guidance, ecosystem knowledge, etc)

Main changes
- ESM / type=module
- Requires Node 22+ 
- Prettier / more readable output (especially for pnpm)
- Interactive guidance for fixing the problems
- Additional support for 
  - monorepos
  - `pnpm.overrides`
  - additional version specifiers 
    - pnpm's workspace protocol
    - `npm:`
    - `link:`
    - `github:`
- Removes `fs-extra`, `chalk`


## Development

- `pnpm install`
- in one terminal run: `pnpm prepare --watch`
- in another terminal run: `~/path/to/this/repo/dist/index.js`
