import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  });
}

export function formatLastSeen(date) {
  if (!date) return 'Desconectado';
  const d = new Date(date);
  const now = new Date();

  const bogotaFormatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const dateStrTarget = bogotaFormatter.format(d);
  const dateStrNow = bogotaFormatter.format(now);

  const time = d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });

  if (dateStrTarget === dateStrNow) {
    return `Últ. vez hoy a las ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStrYesterday = bogotaFormatter.format(yesterday);

  if (dateStrTarget === dateStrYesterday) {
    return `Últ. vez ayer a las ${time}`;
  }

  const dateFormatted = d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Bogota',
  });
  return `Últ. vez ${dateFormatted} a las ${time}`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getAvatarColor(name) {
  if (!name) return '#6b7280';
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
