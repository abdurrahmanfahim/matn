import React, { useState, useRef, useEffect } from 'react';

export default function DropdownMenu({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        {label} <span className="dropdown-caret">▾</span>
      </button>
      {open && (
        <div className="dropdown-menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
