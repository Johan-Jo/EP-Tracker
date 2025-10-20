"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type SimpleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function SimpleDialog({ open, onOpenChange, children }: SimpleDialogProps) {
  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const node = (
    <>
      {/* Backdrop BELOW the panel */}
      <div
        style={{ 
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 99998
        }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
        data-testid="modal-overlay"
      />
      {/* Panel ABOVE everything */}
      <div
        role="dialog"
        aria-modal="true"
        style={{ 
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(900px, 92vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: '1rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          zIndex: 99999
        }}
        data-testid="modal-panel"
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background 
                     transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 
                     focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <div className="p-6">{children}</div>
      </div>
    </>
  );

  // Critical: render to <body> to escape any parent stacking contexts
  return createPortal(node, document.body);
}

