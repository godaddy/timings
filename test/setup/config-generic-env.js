import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '/test.env') });
