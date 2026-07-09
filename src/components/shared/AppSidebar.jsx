'use client';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Play, FileText, Briefcase,
  LogOut, ChevronLeft, ChevronRight,
  Sparkles, User, Settings, HelpCircle,
  ChevronUp, Crown,
} from 'lucide-react';
import PlanBadge from './PlanBadge';
import Logo from './Logo';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectUser, selectPlan, clearCredentials } from '@/store/slices/authSlice';
import { resetSession } from '@/store/slices/interviewSlice';
import { selectSidebarOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { queryClient } from '@/lib/queryClient';
import api from '@/lib/axios';
import { clearTokens } from '@/lib/tokens';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { SIDEBAR_WIDTH_COLLAPSED, getSidebarWidth } from '@/lib/constants/layout';


// ── Main nav (top section) ─────────────────────────────────────────────────
const NAV_ICON_SIZE = 19;

const NAV_ITEMS = [
  { href: '/main/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/main/start-interview', icon: Play,            label: 'Start Interview' },
  { href: '/main/reports',         icon: FileText,        label: 'Reports' },
  { href: '/main/jobs',            icon: Briefcase,       label: 'Job Board', plan: 'premium' },
];

const SUPPORT_EMAIL = 'info@knotopian.com';

function SidebarSupportContent({ plan }) {
  const isPremium = plan === 'premium';
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[#7b7f8c] leading-tight">
        {isPremium ? 'Premium account' : 'Standard account'}
      </p>
      {isPremium ? (
        <p className="text-xs font-medium text-[#2b3240] leading-snug">
          Chat with Support Team
        </p>
      ) : (
        <>
          <p className="text-xs font-medium text-[#2b3240] leading-snug">
            Email to Support Team
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-xs font-medium text-[#0b66d6] hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </>
      )}
    </div>
  );
}

// ── User pop-up menu items ─────────────────────────────────────────────────
const USER_MENU = [
  { href: '/main/upgrade',       icon: Sparkles,    label: 'Upgrade Plan',  accent: true },
  { href: '/main/profile-setup', icon: User,        label: 'Profile' },
  { href: '/main/settings',      icon: Settings,    label: 'Settings' },
  { href: '/main/help',          icon: HelpCircle,  label: 'Help' },
];

export default function AppSidebar() {
  const pathname    = usePathname();
  const router      = useRouter();
  const dispatch    = useAppDispatch();
  const user        = useAppSelector(selectUser);
  const plan        = useAppSelector(selectPlan);
  const sidebarOpen = useAppSelector(selectSidebarOpen);

  /**
   * Session-backed user/plan are preloaded on the client only. The server always
   * sees the Redux defaults, so using them before mount causes hydration mismatches
   * (e.g. extra "Pro" <span> inside nav <Link>). After mount, use real store values.
   */
  const [sessionUIReady, setSessionUIReady] = useState(false);
  useEffect(() => {
    setSessionUIReady(true);
  }, []);

  const [tooltip, setTooltip] = useState(null); // { label, top, left }

  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  /** Fixed position for account menu (viewport coords) */
  const [menuFixed, setMenuFixed] = useState(null);

  const MENU_WIDTH = 248;
  /** Space between trigger top and menu bottom */
  const MENU_GAP_ABOVE = 8;

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuFixed(null);
      return;
    }
    const update = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      if (!t || !t.width) return;
      const pad = 8;
      let left;
      if (sidebarOpen) {
        left = t.left + t.width / 2 - MENU_WIDTH / 2;
        left = Math.max(pad, Math.min(left, window.innerWidth - MENU_WIDTH - pad));
      } else {
        left = 0;
        left = Math.max(0, Math.min(left, window.innerWidth - MENU_WIDTH - pad));
      }
      const bottom = window.innerHeight - t.top + MENU_GAP_ABOVE;
      setMenuFixed({ left, bottom, width: MENU_WIDTH });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [menuOpen, sidebarOpen]);

  // Close popup when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try { await api.post('/auth/logout'); } catch { /* ignore — proceed with local cleanup regardless */ }
    clearTokens();
    dispatch(clearCredentials());
    dispatch(resetSession());
    queryClient.clear();
    router.push('/auth/login');
    toast.success('Logged out successfully');
  };

  const u = sessionUIReady ? user : null;
  const displayPlan = sessionUIReady ? plan : 'free';

  const emailLocal = u?.email?.split('@')[0]?.trim() || '';
  const initials = (() => {
    const name = u?.name?.trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0];
      const b = parts[1]?.[0];
      return ((a || '') + (b || a || '')).toUpperCase().slice(0, 2) || '·';
    }
    if (emailLocal.length >= 2) return emailLocal.slice(0, 2).toUpperCase();
    if (emailLocal.length === 1) return emailLocal.toUpperCase();
    return '·';
  })();

  const shortName = u?.name?.trim()
    ? u.name.trim().split(/\s+/)[0]
    : emailLocal;
  const menuTitle = u?.name?.trim() || '';
  const menuSubtitle = u?.email?.trim() || '';
  const a11yAccount = menuTitle || menuSubtitle || 'Account';

  const showNavTooltip = (e, label) => {
    const itemRect = e.currentTarget.getBoundingClientRect();
    const iconCenterX = itemRect.left + itemRect.width / 2;
    const iconRight = iconCenterX + NAV_ICON_SIZE / 2;
    setTooltip({
      label,
      top: itemRect.top + itemRect.height / 2,
      left: iconRight,
    });
  };

  const sidebarWidth = getSidebarWidth(sidebarOpen);

  return (
    <aside
      ref={sidebarRef}
      className="sidebar transition-all duration-300 bg-white border-r border-[#e3e7ee] flex-shrink-0 relative z-50"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        maxWidth: sidebarWidth,
      }}
    >
      {/* ── Logo ── */}
      <div className={`flex items-center px-4 py-5 ${sidebarOpen ? 'justify-start' : 'justify-center'}`}>
        {sidebarOpen && (
          <div className="pl-1 min-w-0">
            <Logo size="sm" />
          </div>
        )}
      </div>

      {/* ── Collapse toggle — circular, sits just below the header ── */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="absolute right-0 top-[29px] translate-x-1/2 z-10 w-8 h-8 rounded-full bg-white border border-[#e3e7ee] shadow-sm text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
      >
        {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      </button>

      {/* ── Nav items ── */}
      <nav
        className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden"
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label, plan: reqPlan }) => {
          const active = pathname?.startsWith(href);
          const planForNav = sessionUIReady ? plan : 'free';
          const locked = reqPlan && planForNav !== reqPlan && planForNav !== 'premium';

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center py-2.5 rounded-lg text-[15px] font-medium transition-colors whitespace-nowrap ${
                sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'
              } ${
                active
                  ? 'text-[#0b66d6]'
                  : 'text-[#7b7f8c] hover:text-[#2b3240]'
              }`}
              onMouseEnter={!sidebarOpen ? (e) => showNavTooltip(e, label) : undefined}
              onMouseLeave={!sidebarOpen ? () => setTooltip(null) : undefined}
            >
              <Icon size={19} className="flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 truncate">{label}</span>
                  {locked && (
                    <Crown size={15} className="flex-shrink-0 text-amber-500" />
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Collapsed nav tooltip (arrow from icon) ── */}
      {!sidebarOpen && tooltip && (
        <div
          className="fixed z-[200] pointer-events-none -translate-y-1/2 flex items-center"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <span
            aria-hidden
            className="w-0 h-0 shrink-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-white"
            style={{ marginRight: -1 }}
          />
          <span className="whitespace-nowrap rounded-r-md rounded-l-none bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2b3240] border border-[#e3e7ee] border-l-0 shadow-sm">
            {tooltip.label}
          </span>
        </div>
      )}

      {/* ── Footer: support + profile ── */}
      <div className="mt-auto shrink-0 border-t border-[#e3e7ee]" ref={menuRef}>
        {sidebarOpen && (
          <div className="px-3 pt-3 pb-3 border-b border-[#e3e7ee] text-left">
            <SidebarSupportContent plan={displayPlan} />
          </div>
        )}

        <div className={sidebarOpen ? '' : 'px-3 py-3'}>
        {/* Pop-up menu — fixed to viewport so it sits flush above the trigger */}
        {menuOpen && menuFixed && (
          <div
            className="fixed rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden z-[200] max-h-[min(70vh,calc(100vh-24px))] overflow-y-auto"
            style={{
              left: menuFixed.left,
              bottom: menuFixed.bottom,
              width: menuFixed.width,
            }}
          >
            {/* Menu header */}
            <div className="px-4 py-3 border-b border-slate-200">
              {menuTitle && (
                <p className="text-[#2b3240] text-sm font-semibold truncate">{menuTitle}</p>
              )}
              {menuSubtitle && (menuTitle ? menuSubtitle !== menuTitle : true) && (
                <p className={`text-slate-500 text-xs truncate ${menuTitle ? 'mt-0.5' : 'text-sm font-semibold text-[#2b3240]'}`}>
                  {menuSubtitle}
                </p>
              )}
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {USER_MENU.map(({ href, icon: Icon, label, accent }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#2b3240] hover:bg-[#f4f6fa] transition-colors"
                >
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 ${accent ? '' : 'hidden'}`}>
                    ✦
                  </span>
                </Link>
              ))}
            </div>

            {/* Divider + Logout */}
            <div className="border-t border-slate-200 py-1.5">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} className="flex-shrink-0" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}

          {/* ── Profile trigger ── */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-full min-w-0 flex items-center gap-3 transition-colors ${
              sidebarOpen
                ? 'px-3 py-3 rounded-none'
                : 'justify-center p-2 rounded-xl'
            } ${menuOpen ? 'bg-[#d9dde4]' : 'hover:bg-[#eaedf3]'}`}
            title={!sidebarOpen ? `${a11yAccount} — click for menu` : undefined}
            aria-label={`${a11yAccount} account menu`}
            aria-expanded={menuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-[#2f3f55] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>

            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0 overflow-hidden text-left">
                  {!!shortName && (
                    <p className="text-[#1f2937] text-sm font-medium truncate leading-tight">{shortName}</p>
                  )}
                  <PlanBadge plan={displayPlan} className={shortName ? 'mt-1' : ''} />
                </div>
                <ChevronUp
                  size={14}
                  className={`flex-shrink-0 text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
