import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PaymentRequest, PaymentRequestTransportType} from '@cashu/cashu-ts';
import jsQR from 'jsqr';
import pngjs from 'pngjs';
import {readCard, renderCard} from '../build.mjs';

const endpoint = 'https://support.example/episode';

function fixture({target = endpoint, amount, unit = 'sat', singleUse = false, transports} = {}) {
  const request = new PaymentRequest(
    transports ?? [{type: PaymentRequestTransportType.POST, target}],
    'episode-18', amount, unit, undefined, undefined, singleUse,
  ).toEncodedCreqA();
  return {
    show: 'Example Podcast',
    episode: 'An episode',
    message: 'Support the next episode.',
    recipientHost: 'support.example',
    request,
  };
}

test('the exact original request is in both the QR code and the copy field', async () => {
  const input = fixture();
  const html = await renderCard(input);
  const image = /src="data:image\/png;base64,([a-z0-9+/=]+)"/i.exec(html);
  assert.ok(image);
  const png = pngjs.PNG.sync.read(Buffer.from(image[1], 'base64'));
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(code?.data, input.request);
  assert.ok(html.includes(`>${input.request}</textarea>`));
  assert.match(html, /Choose your amount/);
});

test('the card uses the decoded amount and displays the matched host', async () => {
  const html = await renderCard(fixture({amount: 1250}));
  assert.match(html, /1,250 sats/);
  assert.match(html, /<strong class="host">support\.example<\/strong>/);
});

test('raw episode text stays text in the generated document', async () => {
  const html = await renderCard({...fixture(), episode: '</h1><img src="https://example/x">', demo: true});
  assert.match(html, /&lt;\/h1&gt;&lt;img src=&quot;https:\/\/example\/x&quot;&gt;/);
  assert.doesNotMatch(html, /<img src="https:\/\/example\/x">/);
  assert.match(html, /Demo request/);
});

test('rejects a request meant for a different recipient, a non-HTTPS endpoint or a non-HTTP transport', () => {
  assert.throws(() => readCard(fixture({target: 'https://other.example/episode'})), /match recipientHost/);
  assert.throws(() => readCard(fixture({target: 'http://support.example/episode'})), /must use HTTPS/);
  const nostr = [{type: PaymentRequestTransportType.NOSTR, target: 'sample'}];
  assert.throws(() => readCard(fixture({transports: nostr})), /one HTTPS/);
});

test('rejects malformed requests and requests unsuitable for an episode page', () => {
  assert.throws(() => readCard({...fixture(), request: 'cashuA123'}), /creqA/);
  assert.throws(() => readCard({...fixture(), request: 'creqAbroken'}), /decoded/);
  assert.throws(() => readCard(fixture({singleUse: true})), /reusable/);
  assert.throws(() => readCard(fixture({amount: 1, unit: 'usd'})), /denominated in sats/);
});
