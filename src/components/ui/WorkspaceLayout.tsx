import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useMedia } from './useMedia';
import { prefetchRoute } from '../../lib/prefetch';
import { Avatar, BrandMark } from './Avatar';
import { Badge, Dialog, Drawer, IconButton } from './kit';
import { useAppearance, useKeyboardViewport } from '../../lib/appearance';
import type { CommandItem } from './CommandPalette';
const CommandPalette = lazy(() => import('./CommandPalette'));
const nav = [['/', 'Home', 'home'], ['/classes', 'Classes', 'book'], ['/vault', 'Vault', 'folder'], ['/progress', 'Progress', 'chart'], ['/chat', 'Chat', 'chat']] as const;
export default function WorkspaceLayout({ children, user, name, avatar = 0, admin = false, preview = false, classes = [], commands = [], chat, unread = 0, onSignOut }: {
    children: ReactNode;
    user: string;
    name: string;
    avatar?: number;
    admin?: boolean;
    preview?: boolean;
    classes?: {
        id: string;
        name: string;
        icon: string;
    }[];
    commands?: CommandItem[];
    chat?: ReactNode;
    unread?: number;
    onSignOut?: () => void;
}) {
    const small = useMedia('(max-width: 767px)');
    const { prefs, update } = useAppearance(user);
    useKeyboardViewport();
    const location = useLocation();
    const navigate = useNavigate();
    const [menu, setMenu] = useState(false);
    const [palette, setPalette] = useState(false);
    const [help, setHelp] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatWide,setChatWide]=useState(false);
    const [online, setOnline] = useState(navigator.onLine);
    const [notice, setNotice] = useState(() => localStorage.getItem('cqstudio.storage-notice') !== 'dismissed');
    const prefix = preview ? '/preview' : '';
    const path = location.pathname.replace(prefix, '') || '/';
    const link = (p: string) => prefix + p;
    const toggleChat=()=>{if(path==='/chat'){document.querySelector<HTMLTextAreaElement>('.chat-composer textarea,.actual-chat-room textarea')?.focus();return;}setChatOpen(p=>!p);};
    useEffect(() => { const timer = setTimeout(() => { if (preview)
        void import('../../features/workspace/components/PreviewClasses');
    else
        prefetchRoute('/classes'); }, 1500); return () => clearTimeout(timer); }, [preview]);
    useEffect(() => { setMenu(false);if(path==='/chat')setChatOpen(false); const main = document.querySelector('main.workspace-content'); if (main)
        main.scrollTop = 0; }, [location.pathname]);
    useEffect(() => { const f = () => setOnline(navigator.onLine); window.addEventListener('online', f); window.addEventListener('offline', f); return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f); }; }, []);
    useEffect(() => { const key = (e: KeyboardEvent) => { const target = e.target as HTMLElement; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(p => !p);
        return;
    } if (target.closest('input,textarea,select,[contenteditable],dialog') || e.metaKey || e.ctrlKey || e.altKey)
        return; if (e.key === '?')
        setHelp(true); if (e.key.toLowerCase() === 'c' && !document.querySelector('.quiz-practice'))
        toggleChat(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [path]);
    const prefetch = (to: string) => { if (!preview) {
        prefetchRoute(to);
        return;
    } if (to === '/classes')
        void import('../../features/workspace/components/PreviewClasses');
    else if (to === '/vault')
        void import('../../features/workspace/components/PreviewVault');
    else if (to === '/chat')
        void import('../../features/workspace/components/PreviewChat'); };
    const baseCommands: CommandItem[] = [...nav.map(([to, label]) => ({ label, detail: 'Go to page', to: link(to) })), { label: 'New class', detail: 'Action', to: link('/classes?new=1') }, { label: 'Upload a file', detail: 'Action', to: link('/vault?upload=1') }, ...(admin ? [{ label: 'Invite a member', detail: 'Action', to: link('/admin?invite=1') }] : []), ...classes.map(c => ({ label: c.name, detail: 'Class', to: link(`/classes/${c.id}`) })), ...commands];
    const sidebar = <><Link to={link('/')} className="brand"><BrandMark /><span className="nav-copy">CQStudio</span></Link><p className="workspace-caption nav-copy">{preview?'Local preview':'Private workspace'}</p><span className="nav-label nav-copy">WORKSPACE</span><nav aria-label="Main navigation">{nav.map(([to, label, icon]) => <NavLink key={to} to={link(to)} onMouseEnter={() => prefetch(to)} onFocus={() => prefetch(to)} end={to === '/'} title={label}><Icon name={icon}/><span className="nav-copy">{label}</span>{label === 'Chat' && <kbd className="nav-copy">C</kbd>}</NavLink>)}</nav><div className="sidebar-classes"><span className="nav-label nav-copy">YOUR CLASSES</span><nav aria-label="Your classes">{classes.slice(0, 5).map(c => <NavLink key={c.id} to={link(`/classes/${c.id}`)} title={c.name} onClick={() => update({ lastClass: c.id })}><Icon name={c.icon} size={17}/><span className="nav-copy">{c.name}</span></NavLink>)}</nav></div><div className="sidebar-bottom">{admin && <NavLink className="sidebar-admin" to={link('/admin')} title="Admin space"><Icon name="shield"/><span className="nav-copy">Admin space</span></NavLink>}<Link to={link('/settings/profile')} className="profile-link" title="Your profile"><Avatar index={avatar}/><span className="nav-copy">{name}<small>{admin ? 'Administrator' : 'Member'}</small></span><Icon name="settings" size={18}/></Link></div></>;
    const title = path === '/' ? 'Home' : path.split('/')[1]?.replaceAll('-', ' ') ?? 'Workspace';
    return <div className={`workspace-shell ${prefs.collapsed ? 'is-collapsed' : ''} ${preview ? 'is-preview' : ''}`}><a href="#main-content" className="skip-link">Skip to content</a><aside className="workspace-sidebar">{sidebar}<IconButton label={prefs.collapsed ? 'Expand sidebar' : 'Collapse sidebar'} icon="menu" className="sidebar-collapse" onClick={() => update({ collapsed: !prefs.collapsed })}/></aside><div className="workspace-main"><header className="workspace-topbar"><IconButton label="Open navigation" icon="menu" className="phone-menu" onClick={() => setMenu(true)}/><div className="workspace-breadcrumb"><Link to={link('/')}>Workspace</Link><span>/</span><strong>{title}</strong></div>{preview && <Badge>Mock preview</Badge>}<div className="workspace-tools"><button className="workspace-search" onClick={() => setPalette(true)}><Icon name="search" size={18}/><span className="sr-only">Search your workspace</span><span aria-hidden="true">Search your workspace</span><kbd aria-hidden="true">⌘ K</kbd></button><label className="theme-control"><span className="sr-only">Theme</span><Icon name={prefs.theme === 'light' ? 'sun' : 'moon'} size={18}/><select aria-label="Theme" value={prefs.theme} onChange={e => update({ theme: e.target.value as typeof prefs.theme })}><option value="dark">Dark</option><option value="light">Light</option><option value="system">System</option></select></label><IconButton label="Open group chat" icon="chat" onClick={toggleChat}/><Link className="icon-button notification-link" to={link('/notifications')} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Icon name="bell"/>{unread > 0 && <span className="unread-dot"/>}</Link><Link className="topbar-avatar" to={link('/settings/profile')} aria-label="Your profile"><Avatar index={avatar} size={32}/></Link></div></header>{!online && <div className="connection-banner" role="status">You’re offline. Your drafts remain on this device.</div>}{notice && <div className="storage-notice workspace-storage-notice" role="status"><span>Browser storage saves your session and drafts. <Link to="/storage">Storage details</Link></span><button className="text-button" onClick={() => { localStorage.setItem('cqstudio.storage-notice', 'dismissed'); setNotice(false); }}>Got it</button></div>}<div className="workspace-body"><main id="main-content" className={`workspace-content screen-${path.split('/')[1] || 'home'}`} tabIndex={-1}>{children}</main>{!small && chatOpen && chat && <aside className={`docked-chat ${chatWide?'wide':''}`} aria-label="Docked group chat"><header><strong>Group chat</strong><IconButton icon="chevron" label={chatWide?'Make chat narrower':'Make chat wider'} onClick={()=>setChatWide(!chatWide)}/><IconButton icon="close" label="Close chat panel" onClick={() => setChatOpen(false)}/></header>{chat}</aside>}</div><footer className="workspace-footer"><span>CQStudio</span><nav aria-label="Legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/storage">Storage</Link><button className="text-button" onClick={() => setHelp(true)}>Shortcuts</button>{onSignOut && <button className="text-button" onClick={onSignOut}>Sign out</button>}</nav></footer><nav className="bottom-nav" aria-label="Mobile navigation">{[nav[0], nav[1], nav[2], nav[4], ['/settings/profile', 'Me', 'user'] as const].map(([to, label, icon]) => <NavLink to={link(to)} key={to} end={to === '/'}><Icon name={icon} size={21}/><span>{label}</span></NavLink>)}</nav></div><Drawer title="Your workspace" open={menu} onClose={() => setMenu(false)}><div className="mobile-sidebar">{sidebar}<button className="button-secondary" onClick={() => { setMenu(false); setPalette(true); }}>Find a class</button></div></Drawer>{palette && <Suspense fallback={null}><CommandPalette open={palette} onClose={() => setPalette(false)} items={baseCommands}/></Suspense>}<Dialog title="Keyboard shortcuts" open={help} onClose={() => setHelp(false)}><dl className="shortcut-list"><dt>Ctrl / ⌘ + K</dt><dd>Search workspace</dd><dt>C</dt><dd>Toggle group chat</dd><dt>?</dt><dd>Show shortcuts</dd><dt>1–9 / A–I</dt><dd>Select quiz option</dd><dt>Enter</dt><dd>Next question</dd><dt>F</dt><dd>Flag question</dd></dl><button className="button-secondary" onClick={() => { setHelp(false); void navigate('/design'); }}>Open component guide</button></Dialog>{small && chatOpen && chat && <div className="phone-chat"><Drawer title="Group chat" open={chatOpen} onClose={() => setChatOpen(false)}>{chat}</Drawer></div>}</div>;
}
