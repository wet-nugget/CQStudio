import type { CSSProperties } from 'react';
const paths: Record<string, string> = {
    menu: 'M4 6h16M4 12h16M4 18h16',
    close: 'm6 6 12 12M6 18 18 6',
    moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z',
    settings: 'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M9 15v6',
    flag: 'M5 22V3h14l-3 5 3 5H5',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4',
    file: 'M14 2H4v20h16V8Zm0 0v6h6M8 12h8M8 16h6',
    filter: 'M3 4h18l-7 8v7l-4 2v-9Z',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    pin: 'M9 2h6v6l4 4v2H5v-2l4-4ZM12 14v8',
    home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    book: 'M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15',
    folder: 'M3 7V4h6l2 3h10v13H3Zm0 0h18',
    chart: 'M4 3v18h17M8 17v-5m5 5V7m5 10V4',
    chat: 'M21 11a9 9 0 0 1-9 9H3l2-4a9 9 0 1 1 16-5ZM8 11h.01M12 11h.01M16 11h.01',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    plus: 'M12 4v16M4 12h16',
    chevron: 'm9 5 7 7-7 7',
    shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Zm-4 10 3 3 5-6',
    logout: 'M9 3H3v18h6m6-14 5 5-5 5m-8-5h13',
    leaf: 'M21 3c0 13-4 18-11 18a7 7 0 0 1-7-7C3 7 8 3 21 3ZM3 21l12-12',
    clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    sun: 'M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
    check: 'm5 12 4 4L19 6',
    lock: 'M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4Zm8 5v3',
    globe: 'M2 12h20M12 2c-7 7-7 13 0 20 7-7 7-13 0-20ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    flask: 'M9 2h6m-5 0v7L3 20c0 1 1 2 2 2h14c1 0 2-1 2-2L14 9V2M7 14h10',
    code: 'm8 5-7 7 7 7M16 5l7 7-7 7m-3-17-2 22',
    calculator: 'M5 2h14v20H5ZM8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1',
    palette: 'M12 2a10 10 0 0 0 0 20h2a3 3 0 0 0 2-5c-1-1 0-3 2-3h1a3 3 0 0 0 3-3 10 10 0 0 0-10-9ZM7 8h.01M12 6h.01M17 8h.01M6 13h.01',
    language: 'M3 5h12M9 2v3m-4 0c1 7 7 12 10 12M13 5c-1 7-7 12-10 12m12 5 4-11 4 11m-6-4h4',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    user: 'M20 21v-3a8 8 0 0 0-16 0v3M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
};
export function Icon({ name, size = 20, style }: {
    name: string;
    size?: number;
    style?: CSSProperties;
}) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name] ?? paths.book}/></svg>;
}
