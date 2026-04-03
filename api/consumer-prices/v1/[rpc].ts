export const config = { runtime: 'edge' };

import { createDomainGateway, serverOptions } from '../../../server/gateway';
import { createConsumerPricesServiceRoutes } from '../../../src/generated/server/argus/consumer_prices/v1/service_server';
import { consumerPricesHandler } from '../../../server/argus/consumer-prices/v1/handler';

export default createDomainGateway(
  createConsumerPricesServiceRoutes(consumerPricesHandler, serverOptions),
);
