import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {basename, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PaymentRequest, PaymentRequestTransportType} from '@cashu/cashu-ts';
import QRCode from 'qrcode';

const template = await readFile(new URL('./card.html', import.meta.url), 'utf8');

function requiredText(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${label} must contain 1–${max} characters.`);
  }
  return value.trim();
}

function escapeHtml(value) {
  const entities = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  return String(value).replace(/[&<>"']/g, symbol => entities[symbol]);
}

export function readCard(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('The card configuration must be an object.');
  }

  const show = requiredText(config.show, 'Show name', 100);
  const episode = requiredText(config.episode, 'Episode title', 140);
  const message = requiredText(config.message, 'Listener message', 260);
  const expectedHost = requiredText(config.recipientHost, 'Recipient host', 253).toLowerCase();
  const encoded = requiredText(config.request, 'Cashu payment request', 900);
  if (!/^creqA[A-Za-z0-9_-]+={0,2}$/.test(encoded)) {
    throw new Error('Use a Cashu NUT-18 creqA payment request from your receiving wallet or service.');
  }

  let request;
  try {
    request = PaymentRequest.fromEncodedRequest(encoded);
  } catch {
    throw new Error('The Cashu payment request could not be decoded.');
  }
  if (request.singleUse) throw new Error('Use a reusable request for a public episode card.');
  if (request.unit !== 'sat' && !(request.unit === undefined && request.amount === undefined && !request.supportedMethods?.length)) {
    throw new Error('Episode Support Card accepts requests denominated in sats.');
  }
  if (request.transport?.length !== 1 || request.transport[0].type !== PaymentRequestTransportType.POST) {
    throw new Error('Use a request with one HTTPS payment destination.');
  }

  let recipient;
  try {
    recipient = new URL(request.transport[0].target);
  } catch {
    throw new Error('The payment destination is not a valid URL.');
  }
  if (recipient.protocol !== 'https:' || recipient.username || recipient.password || recipient.host !== expectedHost) {
    throw new Error('The payment destination must use HTTPS and match recipientHost.');
  }
  const amount = request.amount?.toBigInt();
  if (amount !== undefined && amount <= 0n) throw new Error('A fixed request amount must be positive.');
  const formattedAmount = amount === undefined ? 'Choose your amount' : `${amount.toLocaleString('en-US')} sats`;

  return {show, episode, message, recipient: recipient.host, encoded, amount: formattedAmount, demo: config.demo === true};
}

export async function renderCard(config) {
  const card = readCard(config);
  const matrix = QRCode.create(card.encoded, {errorCorrectionLevel: 'M'});
  const qrSize = 4 * (matrix.modules.size + 8);
  const qr = await QRCode.toDataURL(card.encoded, {width: 3 * qrSize, margin: 4, errorCorrectionLevel: 'M'});
  const fields = {
    title: `${card.episode} · Support ${card.show}`,
    show: card.show,
    episode: card.episode,
    message: card.message,
    recipient: card.recipient,
    amount: card.amount,
    qr,
    qrSize,
    request: card.encoded,
    demo: card.demo ? '<p class="demo">Demo request · sample destination</p>' : '',
  };
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name) => {
    if (!Object.hasOwn(fields, name)) throw new Error(`Unknown template field ${name}.`);
    return name === 'demo' ? fields[name] : escapeHtml(fields[name]);
  });
}

export async function writeCard(config, outputDir) {
  const html = await renderCard(config);
  await mkdir(outputDir, {recursive: true});
  await writeFile(join(outputDir, 'index.html'), html);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [configPath, outputDir] = process.argv.slice(2);
  if (!configPath || !outputDir) {
    console.error(`Usage: node ${basename(process.argv[1])} <episode.json> <output-directory>`);
    process.exitCode = 2;
  } else {
    try {
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      await writeCard(config, outputDir);
      console.log(`Created ${join(outputDir, 'index.html')}`);
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
