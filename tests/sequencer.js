import Sequencer from '@jest/test-sequencer';

/**
 * Custom test sequencer that controls execution order.
 * Destructive tests (DB clearing, file deletion) always run last.
 */
const testOrder = [
  'tests/health-checks.test.ts',
  'tests/uploads/routes.test.ts',
  'tests/graphql/Virtualize-Videos/routes.test.ts',
  'tests/workflow/orchestration.test.ts',
  'tests/downloads/routes.test.ts',
  'tests/isobmff/routes.test.ts',
  'tests/graphql/Asset-Metadata-Query-Mutation/routes.test.ts',
  'tests/graphql/CompositeClips/routes.test.ts',
  'tests/graphql/routes.test.ts',
  'tests/graphql/System-Tools/routes.test.ts',
  // Destructive: DB clearing and file deletion - always last
  'tests/graphql/System-Tools/Deletions/routes.test.ts',
];

export default class CustomSequencer extends Sequencer {
  sort(tests) {
    return [...tests].sort((a, b) => {
      const indexA = testOrder.findIndex((p) => a.path.endsWith(p));
      const indexB = testOrder.findIndex((p) => b.path.endsWith(p));
      const orderA = indexA === -1 ? testOrder.length : indexA;
      const orderB = indexB === -1 ? testOrder.length : indexB;
      return orderA - orderB;
    });
  }
}
