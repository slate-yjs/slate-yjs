import { describe } from 'vitest';
import { runCollaborationTests } from './support/runCollaborationTests';

describe('voids', async () => {
  runCollaborationTests({ voids: true });
});
