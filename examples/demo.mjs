import {PaymentRequest, PaymentRequestTransportType} from '@cashu/cashu-ts';
import {writeCard} from '../build.mjs';

const recipientHost = 'support.kitchentableradio.example';
const request = new PaymentRequest(
  [{type: PaymentRequestTransportType.POST, target: `https://${recipientHost}/support`}],
  'kitchen-table-episode-18',
  undefined,
  'sat',
  undefined,
  'Support Kitchen Table Radio, episode 18',
).toEncodedCreqA();

await writeCard({
  show: 'Kitchen Table Radio',
  episode: 'What a room remembers',
  message: 'If this conversation stayed with you, send a few sats to help us make the next one.',
  recipientHost,
  request,
  demo: true,
}, 'dist/demo');
console.log('Created dist/demo/index.html');
