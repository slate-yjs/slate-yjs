/* eslint-disable import/no-extraneous-dependencies */
import fc from 'fast-check';
import { appendFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import {
  Action,
  failureSignature,
  FuzzError,
  runFuzz,
  Variant,
} from './harness';

const BASE: Variant = {
  name: 'blocks',
  clients: 2,
  marks: false,
  edgeMarkValues: false,
  inlines: false,
  nested: false,
  voids: false,
  deletingNormalizer: false,
  eagerFlush: true,
};

const VARIANTS: Variant[] = [
  BASE,
  { ...BASE, name: 'blocks, 3 clients', clients: 3 },
  { ...BASE, name: 'marks', marks: true },
  { ...BASE, name: 'edge mark values', marks: true, edgeMarkValues: true },
  { ...BASE, name: 'inlines', inlines: true },
  { ...BASE, name: 'nested blocks', nested: true },
  { ...BASE, name: 'voids', voids: true },
  {
    ...BASE,
    name: 'nested, deleting normalizer',
    nested: true,
    deletingNormalizer: true,
  },
  { ...BASE, name: 'blocks, stale flush', eagerFlush: false },
  {
    ...BASE,
    name: 'everything, stale flush',
    clients: 3,
    marks: true,
    inlines: true,
    nested: true,
    voids: true,
    deletingNormalizer: true,
    eagerFlush: false,
  },
];

const action: fc.Arbitrary<Action> = fc.record({
  kind: fc.nat(1000),
  client: fc.nat(10),
  a: fc.nat(1000),
  b: fc.nat(1000),
  c: fc.nat(1000),
  text: fc.constantFrom('', 'x', 'yz', ' ', '\u{1F600}', 'é', '\n'),
});

const actions = fc.array(action, { minLength: 1, maxLength: 40 });

const RUNS = Number(process.env.FUZZ_RUNS ?? 100);
const CENSUS = Number(process.env.FUZZ_CENSUS ?? 0);

function failureOf(variant: Variant, list: Action[], drain: number) {
  try {
    runFuzz(variant, list, drain);
    return null;
  } catch (error) {
    if (error instanceof FuzzError) {
      return error.failure;
    }
    throw error;
  }
}

describe('fuzz', () => {
  VARIANTS.forEach((variant) => {
    it(`converges: ${variant.name}`, () => {
      fc.assert(
        fc.property(actions, fc.nat(), (list, drain) => {
          runFuzz(variant, list, drain);
        }),
        { numRuns: RUNS, seed: Number(process.env.FUZZ_SEED ?? 42) }
      );
    });
  });
});

// FUZZ_CENSUS=<runs> groups failures by signature and shrinks one example of
// each, so a single run reports every distinct bug the fuzzer can reach.
(CENSUS ? describe : describe.skip)('fuzz census', () => {
  VARIANTS.forEach((variant) => {
    it(`census: ${variant.name}`, () => {
      const found = new Map<string, number>();
      const samples = fc.sample(fc.tuple(actions, fc.nat()), {
        numRuns: CENSUS,
        seed: 7,
      });
      samples.forEach(([list, drain]) => {
        const failure = failureOf(variant, list, drain);
        if (failure) {
          const sig = failureSignature(failure);
          found.set(sig, (found.get(sig) ?? 0) + 1);
        }
      });

      const report: string[] = [];
      found.forEach((count, sig) => {
        const result = fc.check(
          fc.property(fc.tuple(actions, fc.nat()), ([list, drain]) => {
            const failure = failureOf(variant, list, drain);
            return !failure || failureSignature(failure) !== sig;
          }),
          { numRuns: CENSUS * 2, seed: 7 }
        );
        const example = result.counterexample?.[0];
        const failure = example && failureOf(variant, example[0], example[1]);
        report.push(
          [
            `## ${variant.name} | ${count}/${CENSUS} runs | ${sig}`,
            `actions: ${JSON.stringify(example?.[0])} drain: ${example?.[1]}`,
            failure ? `${failure.kind} at step ${failure.step}` : '',
            failure ? failure.message.slice(0, 2000) : '',
          ].join('\n')
        );
      });

      const text = `\n# census ${variant.name}: ${
        found.size
      } signature(s)\n${report.join('\n\n')}\n`;
      if (process.env.FUZZ_REPORT) {
        appendFileSync(process.env.FUZZ_REPORT, text);
      } else {
        // eslint-disable-next-line no-console
        console.log(text);
      }
      expect(true).toBe(true);
    });
  });
});
