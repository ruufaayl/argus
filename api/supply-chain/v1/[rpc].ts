export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createSupplyChainServiceRoutes } from '../../../src/generated/server/argus/supply_chain/v1/service_server';
import { supplyChainHandler } from '../../../server/argus/supply-chain/v1/handler';

export default createDomainGateway(
  createSupplyChainServiceRoutes(supplyChainHandler, serverOptions),
);
