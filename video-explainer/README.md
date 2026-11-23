# Video Explainer

Install with `npm ci`, then render the full composition with `npm run build`.
The output is `out/pcp-explainer.mp4`.

On macOS, the Remotion configuration uses installed Google Chrome when available
to avoid the bundled Headless Shell stalling during root-component loading.
Other platforms retain Remotion's default browser. A CLI
`--browser-executable` option can override the configuration.
