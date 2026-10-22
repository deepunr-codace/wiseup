// Higgsfield Seedance 2.5 text-to-video example. Run with: npm run higgsfield
// Credentials load at runtime from .env.local (HF_CREDENTIALS=KEY_ID:KEY_SECRET) and are never printed.
import { config, higgsfield } from '@higgsfield/client/v2';

try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local: fall back to HF_CREDENTIALS from the environment.
}

const credentials = process.env.HF_CREDENTIALS?.trim();
if (!credentials || !credentials.includes(':')) {
  console.error('HF_CREDENTIALS is missing or not in KEY_ID:KEY_SECRET format. Add it to .env.local.');
  process.exit(1);
}

config({ credentials });

try {
  const result = await higgsfield.subscribe('bytedance/seedance-2.5/text-to-video', {
    input: {
      prompt: 'A cinematic scene at sunset',
      duration: 5,
      resolution: '720p',
      aspect_ratio: '16:9',
    },
    withPolling: true,
  });

  // The SDK types list queued/in_progress/completed/failed/nsfw; anything but "completed" is not a success.
  const status = result.status as string;
  if (status === 'completed' && result.video?.url) {
    console.log(`Completed. Request ${result.request_id}`);
    console.log(`Video URL: ${result.video.url}`);
  } else if (status === 'nsfw') {
    console.error(`Request ${result.request_id} was blocked by moderation (nsfw). No video was produced.`);
    process.exitCode = 1;
  } else if (status === 'failed' || status === 'canceled' || status === 'cancelled') {
    console.error(`Request ${result.request_id} ended with status "${status}". No video was produced.`);
    process.exitCode = 1;
  } else {
    console.error(`Request ${result.request_id} ended without a video (status "${status}").`);
    process.exitCode = 1;
  }
} catch (err) {
  // SDK errors (AuthenticationError, NotEnoughCreditsError, ValidationError, APIError...) are thrown.
  const e = err as Error;
  console.error(`Generation request failed: ${e.name}: ${e.message}`);
  process.exitCode = 1;
}
