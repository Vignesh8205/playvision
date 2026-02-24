/**
 * Main entry point for PlayVision Reporter
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the project root
// This ensures .env is loaded regardless of where the reporter is run from
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export { PlayVisionReporter as default } from './core/reporter';
export { PlayVisionReporter } from './core/reporter';
export * from './schema/types';
export { AIMode } from './ai/interfaces';
