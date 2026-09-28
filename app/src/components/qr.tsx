/** Check-in QR code (S5), drawn with Skia: ink modules on bone paper. */
import { color } from '@drprop/brand/tokens';
import { Canvas, Path, Rect, Skia } from '@shopify/react-native-skia';
import makeQr from 'qrcode-generator';
import { useMemo } from 'react';

export function QrCode({ value, size, label }: { value: string; size: number; label: string }) {
  const { path, cell, quiet } = useMemo(() => {
    const qr = makeQr(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const quietZone = 2;
    const c = size / (n + quietZone * 2);
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(r, col)) d += `M${col} ${r}h1v1h-1z`;
      }
    }
    return { path: Skia.Path.MakeFromSVGString(d)!, cell: c, quiet: quietZone };
  }, [value, size]);

  return (
    <Canvas style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={label}>
      <Rect x={0} y={0} width={size} height={size} color={color.bone} />
      <Path path={path} color={color.ink} transform={[{ translateX: quiet * cell }, { translateY: quiet * cell }, { scale: cell }]} />
    </Canvas>
  );
}
