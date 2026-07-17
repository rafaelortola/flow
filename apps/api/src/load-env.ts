import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(__dirname, '../../../.env'),
]) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}
