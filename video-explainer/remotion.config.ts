import {existsSync} from 'node:fs';
import {Config} from '@remotion/cli/config';

// The bundled Headless Shell can stall before registering the root on macOS.
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (process.platform === 'darwin' && existsSync(macChrome)) {
  Config.setBrowserExecutable(macChrome);
}
