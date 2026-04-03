export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createHealthServiceRoutes } from '../../../src/generated/server/argus/health/v1/service_server';
import { healthHandler } from '../../../server/argus/health/v1/handler';

export default createDomainGateway(
  createHealthServiceRoutes(healthHandler, serverOptions),
);
