export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createPredictionServiceRoutes } from '../../../src/generated/server/argus/prediction/v1/service_server';
import { predictionHandler } from '../../../server/argus/prediction/v1/handler';

export default createDomainGateway(
  createPredictionServiceRoutes(predictionHandler, serverOptions),
);
