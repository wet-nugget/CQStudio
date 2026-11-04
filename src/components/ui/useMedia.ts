import { useEffect, useState } from 'react';
export function useMedia(query: string) { const [matches, setMatches] = useState(() => matchMedia(query).matches); useEffect(() => { const m = matchMedia(query); const change = () => setMatches(m.matches); change(); m.addEventListener('change', change); return () => m.removeEventListener('change', change); }, [query]); return matches; }
