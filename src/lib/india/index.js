export { INDIA_COUNTRY, INDIA_STATES } from './constants';
export {
  DISTRICTS_BY_STATE,
  getDistrictsForState,
  filterPlaceOptions,
} from './districts';

import { INDIA_STATES } from './constants';
import { getDistrictsForState, filterPlaceOptions } from './districts';

export function getIndiaStateOptions() {
  return INDIA_STATES.map((s) => ({ value: s.name, label: s.name }));
}

export function getIndiaDistrictOptions(stateName) {
  return getDistrictsForState(stateName).map((name) => ({ value: name, label: name }));
}

export function filterIndiaStateOptions(query) {
  return filterPlaceOptions(getIndiaStateOptions(), query);
}

export function filterIndiaDistrictOptions(stateName, query) {
  return filterPlaceOptions(getIndiaDistrictOptions(stateName), query);
}

/** Ensure mobile values start with India +91 when empty or digits-only. */
export function withIndiaPhoneDefault(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '+') return '+91';
  return raw;
}
