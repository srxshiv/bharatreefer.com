/** Opens a WhatsApp chat with the number, with the message already typed in. */
export function whatsappLink(e164: string, message: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
