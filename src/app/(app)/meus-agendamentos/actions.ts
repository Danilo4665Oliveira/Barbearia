"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/slots";

const MIN_HOURS_BEFORE = 2; 

type Result = { ok: true } | { ok: false; error: string };

async function getOwnAppointment(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.appointment.findFirst({
    where: { id, userId: session.user.id, status: "SCHEDULED" },
    include: { service: true },
  });
}

function tooLate(startsAt: Date) {
  return startsAt.getTime() - Date.now() < MIN_HOURS_BEFORE * 3_600_000;
}

const lateMessage = `Só dá para alterar com ${MIN_HOURS_BEFORE}h de antecedência. Fale direto com o barbeiro.`;

export async function cancelAppointment(id: string): Promise<Result> {
  const appt = await getOwnAppointment(id);
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  if (tooLate(appt.startsAt)) return { ok: false, error: lateMessage };

  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELED" },
  });

  
  revalidatePath("/meus-agendamentos");
  return { ok: true };
}

export async function fetchRescheduleSlots(id: string, date: string) {
  const appt = await getOwnAppointment(id);
  if (!appt) return [];
  return getAvailableSlots({
    barberId: appt.barberId,
    serviceId: appt.serviceId,
    date,
    ignoreAppointmentId: id,
  });
}

export async function rescheduleAppointment(
  id: string,
  newStartsAtIso: string
): Promise<Result> {
  const appt = await getOwnAppointment(id);
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  if (tooLate(appt.startsAt)) return { ok: false, error: lateMessage };

  const startsAt = new Date(newStartsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Horário inválido." };
  }

  // revalida no servidor, ignorando o próprio agendamento
  const date = startsAt.toLocaleDateString("sv-SE", {
    timeZone: "America/Recife",
  });
  const slots = await getAvailableSlots({
    barberId: appt.barberId,
    serviceId: appt.serviceId,
    date,
    ignoreAppointmentId: id,
  });
  if (!slots.includes(startsAt.toISOString())) {
    return { ok: false, error: "Esse horário não está mais disponível." };
  }

  try {
    await prisma.appointment.update({
      where: { id },
      data: {
        startsAt,
        endsAt: new Date(startsAt.getTime() + appt.service.durationMin * 60_000),
      },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Esse horário acabou de ser ocupado." };
  }


  revalidatePath("/meus-agendamentos");
  return { ok: true };
}