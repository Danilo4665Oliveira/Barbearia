"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/slots";

export async function fetchSlots(
  barberId: string,
  serviceId: string,
  date: string
) {
  const session = await auth();
  if (!session?.user?.id) return [];
  return getAvailableSlots({ barberId, serviceId, date });
}

export async function createAppointment(input: {
  barberId: string;
  serviceId: string;
  startsAtIso: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Faça login para agendar." };
  }

  const service = await prisma.service.findUnique({
    where: { id: input.serviceId },
  });
  if (!service || !service.active) {
    return { ok: false, error: "Serviço inválido." };
  }

  const startsAt = new Date(input.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Horário inválido." };
  }

  // revalida no servidor: o horário ainda está livre?
  const date = startsAt.toLocaleDateString("sv-SE", {
    timeZone: "America/Recife",
  });
  const slots = await getAvailableSlots({
    barberId: input.barberId,
    serviceId: input.serviceId,
    date,
  });
  if (!slots.includes(startsAt.toISOString())) {
    return { ok: false, error: "Esse horário não está mais disponível." };
  }

  try {
    await prisma.appointment.create({
      data: {
        userId: session.user.id,
        barberId: input.barberId,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Esse horário acabou de ser ocupado." };
  }


  return { ok: true };
}