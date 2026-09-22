import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

type MenuPos = { top: number; left: number; minWidth: number };

interface PortalMenuProps {
  open: boolean;
  onClose: () => void;
  /** Element the menu anchors to (usually the trigger button wrapper). */
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  /** Prefer aligning the menu’s right edge with the anchor. */
  align?: 'start' | 'end';
  minWidth?: number;
}

/** Renders a dropdown in a portal so it is not clipped by overflow/sticky parents. */
export function PortalMenu({
  open,
  onClose,
  anchorRef,
  children,
  className,
  align = 'end',
  minWidth = 160,
}: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPos | null>(null);

  const updatePos = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, minWidth);
    const left =
      align === 'end'
        ? Math.min(rect.right - width, window.innerWidth - width - 8)
        : Math.max(8, rect.left);
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, left),
      minWidth: width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open, align, minWidth]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, onClose, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
      }}
      className={cn(
        'z-[90] rounded-lg border border-slate-200 bg-white py-1 shadow-lg',
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}
