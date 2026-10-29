import { prisma } from "@/lib/prisma";

const TZ_OFFSET = "-03:00";
const STEP_MIN = 30; // intervalo de horários

function toDate(date: string, time: string) {
  return new Date(`${date}T${time}:00${TZ_OFFSET}`);
}

export async function getAvailableSlots(params: {
  barberId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  ignoreAppointmentId?: string;
}) {
  const { barberId, serviceId, date, ignoreAppointmentId } = params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return [];

  const weekday = new Date(`${date}T12:00:00${TZ_OFFSET}`).getUTCDay();

  const hours = await prisma.businessHours.findUnique({
    where: { barberId_weekday: { barberId, weekday } },
  });
  if (!hours) return [];

  const dayStart = toDate(date, hours.startTime);
  const dayEnd = toDate(date, hours.endTime);

  const booked = await prisma.appointment.findMany({
    where: {
      barberId,
      status: "SCHEDULED",
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
      ...(ignoreAppointmentId && { id: { not: ignoreAppointmentId } }),
    },
    select: { startsAt: true, endsAt: true },
  });

  const now = new Date();
  const durationMs = service.durationMin * 60_000;
  const slots: string[] = [];

  for (
    let t = dayStart.getTime();
    t + durationMs <= dayEnd.getTime();
    t += STEP_MIN * 60_000
  ) {
    const start = new Date(t);
    const end = new Date(t + durationMs);
    if (start <= now) continue;

    const conflict = booked.some((b) => b.startsAt < end && b.endsAt > start);
    if (!conflict) slots.push(start.toISOString());
  }

  return slots;
}
