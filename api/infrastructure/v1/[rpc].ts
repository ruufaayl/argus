export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createInfrastructureServiceRoutes } from '../../../src/generated/server/argus/infrastructure/v1/service_server';
import { infrastructureHandler } from '../../../server/argus/infrastructure/v1/handler';

export default createDomainGateway(
  createInfrastructureServiceRoutes(infrastructureHandler, serverOptions),
);
