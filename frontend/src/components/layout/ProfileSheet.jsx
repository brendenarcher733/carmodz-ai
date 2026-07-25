import { Link } from 'react-router-dom'

/* Mobile-only bottom sheet opened from BottomNav's Profile tab — the mobile
   equivalent of Navbar.jsx's desktop-only UserMenu dropdown. */
export function ProfileSheet({ open, onClose, user, onLogout }) {
  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="glass-strong absolute bottom-0 inset-x-0 rounded-t-3xl border-b-0 overflow-hidden animate-fade-up"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <div className="w-9 h-1 rounded-full bg-white/[0.15] mx-auto mt-3 mb-1" />

        <div className="px-6 py-4 border-b border-white/[0.05]">
          <div className="font-display font-semibold text-white text-base truncate">{user.name}</div>
          <div className="font-mono text-xs text-muted truncate">{user.email}</div>
        </div>

        <div className="px-3 py-2">
          {user.is_admin && (
            <Link
              to="/admin"
              onClick={onClose}
              className="tap-target w-full flex items-center gap-3 px-3 rounded-xl text-body hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted">
                <rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              <span className="text-sm font-medium">Admin Dashboard</span>
            </Link>
          )}
          <button
            onClick={onLogout}
            className="tap-target w-full flex items-center gap-3 px-3 rounded-xl text-red-400 hover:bg-red-500/[0.06] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3H3a1 1 0 00-1 1v8a1 1 0 001 1h3M10 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
