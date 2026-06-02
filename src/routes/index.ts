import { Router } from 'express';
import { uploadsRouter } from '@/routes/uploads.ts';
import { isobmffRouter } from '@/routes/isobmff.ts';
import { downloadsRouter } from '@/routes/downloads.ts';
import { mseRouter } from '@/routes/mse.ts';

const routes = Router();

routes.use('/uploads', uploadsRouter);
routes.use('/downloads', downloadsRouter);
routes.use('/isobmff', isobmffRouter);
routes.use('/mse', mseRouter);

export { routes };
