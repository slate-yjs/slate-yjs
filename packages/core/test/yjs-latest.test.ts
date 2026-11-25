import { describe } from 'vitest';
import { runCollaborationTests } from './support/runCollaborationTests';

const skip =
  process.env.YJS_VERSIONS && !process.env.YJS_VERSIONS.includes('latest');

(skip ? describe.skip : describe)('latest yjs', () => {
  runCollaborationTests();
});
