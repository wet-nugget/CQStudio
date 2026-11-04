import { useEffect, useState } from 'react';
export type Theme = 'light' | 'dark' | 'system';
export interface Preferences {
    theme: Theme;
    density: 'compact' | 'comfortable';
    collapsed: boolean;
    lastClass: string;
    lastTab: string;
}
export function readPreferences(user: string): Preferences {
    const defaults: Preferences = { theme: 'dark', density: matchMedia('(pointer: coarse)').matches ? 'comfortable' : 'compact', collapsed: false, lastClass: '', lastTab: 'Lessons' };
    try {
        const raw = JSON.parse(localStorage.getItem(`cqstudio.user.${user}.ui`) ?? 'null') as Record<string, unknown> | null;
        if (!raw || typeof raw !== 'object')
            return defaults;
        return { theme: ['dark', 'light', 'system'].includes(String(raw.theme)) ? raw.theme as Theme : defaults.theme, density: raw.density === 'comfortable' || raw.density === 'compact' ? raw.density : defaults.density, collapsed: raw.collapsed === true, lastClass: typeof raw.lastClass === 'string' ? raw.lastClass.slice(0, 100) : '', lastTab: typeof raw.lastTab === 'string' ? raw.lastTab.slice(0, 40) : defaults.lastTab };
    }
    catch {
        return defaults;
    }
}
export function applyTheme(theme: Theme) { const mode = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme; document.documentElement.dataset.theme = mode; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#0F1623' : '#F5F6FA'); document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', mode); }
export function useAppearance(user: string) { const [prefs, setPrefs] = useState(() => readPreferences(user)); useEffect(() => { setPrefs(readPreferences(user)); const sync = (event:Event) => {const detail=(event as CustomEvent<{user:string;prefs:Preferences}>).detail;if(detail?.user===user)setPrefs(detail.prefs);}; window.addEventListener('cqstudio-appearance', sync); return () => window.removeEventListener('cqstudio-appearance', sync); }, [user]); useEffect(() => { applyTheme(prefs.theme); document.documentElement.dataset.density = prefs.density; const media = matchMedia('(prefers-color-scheme: dark)'); const apply = () => applyTheme(prefs.theme); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply); }, [prefs]); return { prefs, update: (values: Partial<Preferences>) => { const next = { ...prefs, ...values }; setPrefs(next); try {
        localStorage.setItem(`cqstudio.user.${user}.ui`, JSON.stringify(next));
    }
    catch { /* Keep in-memory preferences. */ } window.dispatchEvent(new CustomEvent('cqstudio-appearance',{detail:{user,prefs:next}})); } }; }
// A visual viewport height follows the software keyboard without scrolling the shell.
export function useKeyboardViewport() { useEffect(() => { const viewport = window.visualViewport; const update = () => { document.documentElement.style.setProperty('--app-height', `${viewport?.height ?? window.innerHeight}px`); }; update(); viewport?.addEventListener('resize', update); window.addEventListener('resize', update); return () => { viewport?.removeEventListener('resize', update); window.removeEventListener('resize', update); document.documentElement.style.removeProperty('--app-height'); }; }, []); }
