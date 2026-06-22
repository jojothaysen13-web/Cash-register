import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
}

// Hardware barcode scanners act as a keyboard: they type the code and send Enter.
// This field stays focused so a physical scan always lands here, but it also
// accepts manual typing for damaged/unreadable barcodes.
export function BarcodeScanner({ onScan, disabled }: BarcodeScannerProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = value.trim();
    if (code) onScan(code);
    setValue('');
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoFocus
      disabled={disabled}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="Barcode scannen oder eingeben + Enter"
      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-mono tracking-wide focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
    />
  );
}
