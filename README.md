# Road Choice
Helix v5 sites for Road Choice

## Environments:
- Preview: https://main--vg-roadchoice-com--volvogroup.aem.page
- Live: https://main--vg-roadchoice-com--volvogroup.aem.live

### Other markets:

#### Roadchoice.ca:
- Preview: https://main--roadchoice-ca--volvogroup.aem.page
- Live: https://main--roadchoice-ca--volvogroup.aem.live

#### Roadchoice.mx:
- Preview: https://main--roadchoice-mx--volvogroup.aem.page
- Live: https://main--roadchoice-mx--volvogroup.aem.live


## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Install the [Helix CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
2. Start the AEM proxy: `aem up` (opens your browser at http://localhost:3000)
3. Open the `{repo}` directory in your favorite IDE and start coding :)

**Note for Safari users:** When testing the dealer locator, run `npm run proxy:cors` in a separate terminal (starts CORS proxy on port 3001).

## Best practices using fonts

* We are using [fallback fonts](https://github.com/pixel-point/fontpie) that avoid CLS.
* The fallback fonts are specific to the font family and style (bold, italic etc)
* For this reason, please don't use the font-style properties in css. Instead, use the font family variables defined in `styles/styles.css`
* Eg. for subheadings instead of using `font-weight: 500`, use `font-family: var(--subheadings-ff-medium);`
