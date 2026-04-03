export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createUnrestServiceRoutes } from '../../../src/generated/server/argus/unrest/v1/service_server';
import { unrestHandler } from '../../../server/argus/unrest/v1/handler';

export default createDomainGateway(
  createUnrestServiceRoutes(unrestHandler, serverOptions),
);
