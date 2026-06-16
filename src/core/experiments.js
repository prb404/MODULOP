import { componentSources } from "./component-sources.js";

export const experiments = componentSources;

export function experimentFor(implementation) {
  return componentSources.find((item) => item.implementation === implementation);
}
