# Usage

You can run Creagen Editor completely locally so you don't need any connection to the outside world while writing sketches or change the editor to your desire while still allowing for storing commits remotely.

## Install

```sh
git clone https://github.com/lyr-7d1h/creagen-editor
cd creagen-editor
npm install
```

## Running



**Run creagen editor locally**

```sh
npm start
```

**Run with local creagen library build**

`CREAGEN_DEV_PATH`  - path to creagen library folder (defaults to ../creagen), the full path to the package will be `$CREAGEN_DEV_PATH/dist/creagen.js`.

```sh
CREAGEN_DEV_PATH=<path to local creagen version> npm start
```


**Run local build with remote storage**
> [!WARNING] 
> if you are running a different build than what the remote was designed for it might corrupt your data
```sh
CREAGEN_TURNSTILE_SITE_KEY=0x4AAAAAAC1B7j42DqgKtO_I CREAGEN_REMOTE_URL=https://storage.creagen.dev npm start
```

## Build variables

These values are injected at build time through Vite define values in vite.config.mjs.
They are compile-time constants in the client bundle, not runtime reads from process.env.

| Variable | Default | Description |
| --- | --- | --- |
| `CREAGEN_MODE` | None (provided by Vite) | Toggles dev-specific behavior like extra sandbox permissions and profiling/timing paths. Typical values: `dev`, `production`. |
| `CREAGEN_DEV_VERSION` | `null` | Lets importer/editor treat a local creagen checkout as a known version during local library development. |
| `CREAGEN_EDITOR_VERSION` | `package.json` version | Shown in UI and used for editor version compatibility checks. |
| `CREAGEN_EDITOR_COMMIT_HASH` | `null` if not resolvable | Shows short commit metadata in the editor UI. |
| `CREAGEN_EDITOR_CONTROLLER_URL` | `null` | Enables controller features when configured. |
| `CREAGEN_EDITOR_SANDBOX_RUNTIME_URL` | `/sandbox-runtime/` | URL used as iframe `src` for the sandbox runtime. |
| `CREAGEN_LOG_LEVEL` | `0` | Filters emitted/surfaced logs. Levels: `trace=0`, `debug=1`, `info=2`, `warning=3`, `error=4`. |
| `CREAGEN_REMOTE_URL` | `null` | Enables remote backend features (auth/storage APIs) when configured. |
| `CREAGEN_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` | Cloudflare Turnstile site key used by login/signup captcha (default is test key). |

## Example

```sh
CREAGEN_EDITOR_CONTROLLER_URL=https://controller.creagen.dev \
CREAGEN_EDITOR_SANDBOX_RUNTIME_URL=/sandbox-runtime/ \
CREAGEN_LOG_LEVEL=2 \
CREAGEN_REMOTE_URL=https://storage.creagen.dev \
CREAGEN_TURNSTILE_SITE_KEY=0x4AAAAAAC1B7j42DqgKtO_I \
npm start
```

## Notes

- Because these are build-time constants, changing environment values requires restarting or rebuilding the Vite process.
- For local library development, also set CREAGEN_DEV_PATH to your local creagen checkout path.
