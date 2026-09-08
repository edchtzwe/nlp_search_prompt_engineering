import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import express from 'express';
import { expressMiddleware } from '@as-integrations/express5';
import { startApolloServer } from '@/graphql/index.ts';
import { routes } from '@/routes/index.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const corsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  if (req.path.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
  }
  if (req.path.endsWith('.m4s')) {
    res.setHeader('Content-Type', 'video/iso.segment');
    res.setHeader('Accept-Ranges', 'bytes');
  }
  next();
});

app.use(express.json());

app.get('/health-check', (_req, res) => {
  res.json({ app_name: "ion discovery proto" });
});

app.use(express.static(path.join(import.meta.dirname, '../src')));
app.use('/', routes);

async function bootstrap() {
  const apolloServer = await startApolloServer();
  app.use('/graphql', expressMiddleware(apolloServer));

  app.listen(PORT, HOST, () => {
    console.info(`Server running on ${HOST}:${PORT}`);
    console.info(`GraphQL endpoint ready at http://${HOST}:${PORT}/graphql`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});