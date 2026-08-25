export const CATEGORIES = ["Pestañas", "Cejas", "Uñas", "Cabello", "Maquillaje"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Service {
  id: string;
  category: Category;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  icon: string;
  active: boolean;
}

export interface Professional {
  id: string;
  name: string;
  active: boolean;
}

export type BookingStatus = "confirmado" | "cancelado";

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  professionalId: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  status: BookingStatus;
  calendarEventId?: string;
  createdAt: string;
}

export interface Slot {
  time: string;
  available: boolean;
}
