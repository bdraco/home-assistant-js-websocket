import { getCollection } from "./collection.js";
import { HassServices, HassDomainServices, UnsubscribeFunc } from "./types.js";
import { Connection } from "./connection.js";
import { Store } from "./store.js";
import { getServices } from "./commands.js";

type ServiceRegisteredEvent = {
  data: {
    domain: string;
    service: string;
  };
};

type ServiceRemovedEvent = {
  data: {
    domain: string;
    service: string;
  };
};

function processServiceRegistered(
  state: HassServices,
  event: ServiceRegisteredEvent
) {
  if (state === undefined) return null;

  const { domain, service } = event.data;

  const domainInfo = Object.assign({}, state[domain], {
    [service]: { description: "", fields: {} }
  });

  return { [domain]: domainInfo };
}

function processServiceRemoved(
  state: HassServices,
  event: ServiceRemovedEvent
) {
  if (state === undefined) return null;

  const { domain, service } = event.data;
  const curDomainInfo = state[domain];

  if (!curDomainInfo || !(service in curDomainInfo)) return null;

  const domainInfo: HassDomainServices = {};
  Object.keys(curDomainInfo).forEach(sKey => {
    if (sKey !== service) domainInfo[sKey] = curDomainInfo[sKey];
  });

  return { [domain]: domainInfo };
}

const fetchServices = (conn: Connection) => getServices(conn);
const subscribeUpdates = (conn: Connection, store: Store<HassServices>) =>
  Promise.all([
    conn.subscribeEvents<ServiceRegisteredEvent>(
      store.action(processServiceRegistered),
      "service_registered"
    ),
    conn.subscribeEvents<ServiceRemovedEvent>(
      store.action(processServiceRemoved),
      "service_removed"
    )
  ]).then(unsubs => () => unsubs.forEach(fn => fn()));

const servicesColl = (conn: Connection) =>
  getCollection(conn, "_srv", fetchServices, subscribeUpdates);

export const subscribeServices = (
  conn: Connection,
  onChange: (state: HassServices) => void
): UnsubscribeFunc => servicesColl(conn).subscribe(onChange);
