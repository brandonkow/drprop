export function whatsappUrl(number: string | null, message: string): string | null {
  if (!number || !/^60\d{8,11}$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
