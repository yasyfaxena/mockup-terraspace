import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrPass({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#1b1b3a", light: "#ffffff" },
    }).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div className={className} style={{ width: size, height: size }} aria-label="QR access code">
      {src ? (
        <img
          src={src}
          alt="QR access code for your booking"
          width={size}
          height={size}
          className="size-full rounded-lg border border-border bg-white p-2"
        />
      ) : (
        <div className="size-full animate-pulse rounded-lg border border-border bg-muted" />
      )}
    </div>
  );
}
