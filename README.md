# Episode Support Card

A static Cashu support card for podcast episodes. A publisher brings a reusable NUT-18 request from a receiving service and builds a small page listeners can scan or copy from. The card checks at build time that the request's HTTPS host matches the one the publisher intended. The listener's wallet handles fees, mint selection and approval.

Built for the Nut November Value4Value track in November 2026. The sample uses a reserved `.example` endpoint. Cashu transfers are outside the demo.

## Try the demo

With Node.js 22 or newer and pnpm installed:

```sh
pnpm install --frozen-lockfile
pnpm demo
pnpm test
```

Open `dist/demo/index.html` in a browser. The QR and copy field contain the same sample request. The page works from a local file and its resources are embedded. If browser clipboard access is unavailable, **Copy Cashu request** opens the text field and selects the request for manual copying.

## Build a card

1. Obtain a reusable `creqA` request with one HTTPS POST transport, denominated in sats. Determine the intended recipient host independently of the encoded request.
2. Save the configuration as `episode.json` using this shape. Replace the sample values with your episode metadata, recipient host and your service's encoded request.

   ```json
   {
     "show": "Kitchen Table Radio",
     "episode": "What a room remembers",
     "message": "Send a few sats to help us make the next one.",
     "recipientHost": "your-receiver.example",
     "request": "paste the reusable creqA value here"
   }
   ```

3. Run `pnpm build episode.json dist/episode-18`. Publish that directory with the rest of your static site. Link listeners to its `index.html` or embed it with a descriptive iframe title. In a cross-origin iframe, the host can delegate the `clipboard-write` permission or use the manual-copy fallback.

   ```html
   <iframe title="Support episode 18 with Cashu" src="/support/episode-18/"
     width="850" height="720" style="max-width:100%;border:0" loading="lazy"></iframe>
   ```

One HTTPS POST transport is the supported subset in this release. The package decodes the request with Cashu-TS, presents its asserted amount and host, and passes the original request intact to the wallet. It does not own or verify the receiver, contact a mint, inspect funds, or confirm settlement. Confirm your receiver and wallet support before going live.

The automated checks decode the generated QR image to verify the payload round-trip and cover fixed and flexible amounts, malformed requests, transport restrictions and HTML escaping. The project uses the MIT license.

[Cashu NUT-18](https://cashubtc.github.io/nuts/18/) · [Value4Value track](https://nutnovember.org/tracks/value4value)
