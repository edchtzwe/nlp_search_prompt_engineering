import { resolvers as clipper } from './clippper.ts';
import { resolvers as composite } from './composite.ts';
import { resolvers as health } from './health.ts';
import { resolvers as isobmff } from './isobmff.ts';
import { resolvers as mse } from './mse.ts';
import { resolvers as nlp } from './NaturalLanguageProcessing.ts';
import { resolvers as seamstress } from './seamstress.ts';
import { resolvers as source } from './source.ts';
import { resolver as system } from './system.ts';

export const resolvers = [
    clipper,
    composite,
    health,
    isobmff,
    mse,
    nlp,
    seamstress,
    source,
    system
];
