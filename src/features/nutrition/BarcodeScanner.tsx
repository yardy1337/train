import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { Button, TextInput } from '../../components/ui';

/** Сканер штрихкода камерой (библиотека загружается только при открытии). */
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const done = useRef(false);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Камера недоступна (нужен HTTPS)');
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const c = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (result, _err, ctl) => {
            if (result && !done.current) {
              done.current = true;
              ctl.stop();
              navigator.vibrate?.(80);
              onDetected(result.getText());
            }
          },
        );
        if (cancelled) c.stop();
        else controls = c;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось запустить камеру');
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-accent/80" />
      </div>
      {error ? (
        <p className="text-sm text-amber-400">{error}. Введите штрихкод вручную.</p>
      ) : (
        <p className="text-center text-sm text-zinc-400">Наведите камеру на штрихкод</p>
      )}
      <div className="flex gap-2">
        <TextInput
          inputMode="numeric"
          placeholder="Штрихкод вручную"
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
        />
        <Button variant="primary" disabled={manual.length < 6} onClick={() => onDetected(manual)}>
          Найти
        </Button>
      </div>
    </div>
  );
}
