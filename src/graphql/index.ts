import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers/index.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const typeDefs = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8');

const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

export async function startApolloServer() {
    const server = new ApolloServer({ schema });
    await server.start();
    return server;
}
