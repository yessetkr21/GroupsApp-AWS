import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatLastSeen(date) {
  if (!date) return 'Desconectado';
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Últ. vez: hace un momento';
  if (diffMin < 60) return `Últ. vez: hace ${diffMin} min`;
  if (diffHrs < 24) return `Últ. vez: hace ${diffHrs}h`;
  return `Últ. vez: ${then.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} ${then.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

export function getAvatarColor(name) {
  if (!name) return '#6b7280';
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
