import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// The menu is rendered into document.body (not inline under the trigger)
// and positioned with `fixed` coordinates computed from the trigger's own
// rect. This is deliberate: toolbars like `.top-actions` use
// `overflow-x: auto`, and per the CSS overflow spec that forces
// `overflow-y` to compute as `auto` too — which silently clips any
// absolutely-positioned menu that would otherwise hang below it. Portaling
// escapes that clipping entirely instead of fighting it.
export default function DropdownMenu({ label, children, className = '' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      const insideTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const insideMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!insideTrigger && !insideMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggle = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };

  return (
    <div className={`dropdown ${className}`.trim()}>
      <button className="btn" ref={triggerRef} onClick={toggle}>
        {label} <span className="dropdown-caret">▾</span>
      </button>
      {open && pos && createPortal(
        <div
          className="dropdown-menu"
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}
