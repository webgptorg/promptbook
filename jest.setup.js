import 'cross-fetch/polyfill';
import * as dotenv from 'dotenv';
import { TextDecoder, TextEncoder } from 'util';

// Polyfill TextEncoder and TextDecoder for jsdom/whatwg-url
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

dotenv.config({ path: '.env' });
