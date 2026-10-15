import useLocalStorage from './useLocalStorage';
import { APP_MODES, isVestDomain } from '../appMode';

export default function useViewPreferences() {
  const [viewPrefs, setViewPrefs] = useLocalStorage('vibes-and-grinds:view-preferences', {
    sortBy: 'date',
    searchQuery: '',
    sportFilter: '',
    repeatFilter: '',
    scopeFilter: '',
    appMode: isVestDomain ? APP_MODES.VEST : APP_MODES.VIBES,
  });

  const sortBy = viewPrefs.sortBy || 'date';
  const sortAsc = viewPrefs.sortAsc || false;
  const searchQuery = viewPrefs.searchQuery || '';
  const sportFilter = viewPrefs.sportFilter || '';
  const repeatFilter = viewPrefs.repeatFilter || '';
  const scopeFilter = viewPrefs.scopeFilter || '';
  const appMode = isVestDomain
    ? APP_MODES.VEST
    : (viewPrefs.appMode || APP_MODES.VIBES);
  const viewTab = viewPrefs.viewTab || 'visits';

  const setSortBy = (v) => setViewPrefs((p) => {
    if (p.sortBy === v) return { ...p, sortAsc: !p.sortAsc };
    return { ...p, sortBy: v, sortAsc: false };
  });
  const setSearchQuery = (v) => setViewPrefs((p) => ({ ...p, searchQuery: v }));
  const setSportFilter = (v) => setViewPrefs((p) => ({ ...p, sportFilter: v }));
  const setRepeatFilter = (v) => setViewPrefs((p) => ({ ...p, repeatFilter: v }));
  const setScopeFilter = (v) => setViewPrefs((p) => ({ ...p, scopeFilter: v }));
  const setViewTab = (v) => setViewPrefs((p) => ({ ...p, viewTab: v }));
  const setAppMode = (v) => setViewPrefs((p) => ({ ...p, appMode: typeof v === 'function' ? v(p.appMode) : v }));

  return {
    sortBy,
    sortAsc,
    searchQuery,
    sportFilter,
    repeatFilter,
    scopeFilter,
    appMode,
    viewTab,
    setSortBy,
    setSearchQuery,
    setSportFilter,
    setRepeatFilter,
    setScopeFilter,
    setViewTab,
    setAppMode,
  };
}
