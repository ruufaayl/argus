export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createConflictServiceRoutes } from '../../../src/generated/server/argus/conflict/v1/service_server';
import { conflictHandler } from '../../../server/argus/conflict/v1/handler';

export default createDomainGateway(
  createConflictServiceRoutes(conflictHandler, serverOptions),
);
