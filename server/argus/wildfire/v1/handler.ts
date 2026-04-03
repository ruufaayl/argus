import type { WildfireServiceHandler } from '../../../../src/generated/server/argus/wildfire/v1/service_server';

import { listFireDetections } from './list-fire-detections';

export const wildfireHandler: WildfireServiceHandler = {
  listFireDetections,
};
