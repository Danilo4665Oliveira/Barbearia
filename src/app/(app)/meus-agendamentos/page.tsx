import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentCard } from "./appointment-card";

const fmt = (d: Date) =>
  d.toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });

export default async function MeusAgendamentosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const now = new Date();

  const [upcoming, history] = await Promise.all([
    prisma.appointment.findMany({
      where: { userId, status: "SCHEDULED", startsAt: { gte: now } },
      include: { service: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        userId,
        OR: [{ status: { not: "SCHEDULED" } }, { startsAt: { lt: now } }],
      },
      include: { service: true },
      orderBy: { startsAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="mx-auto max-w-xl space-y-8 p-4">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Meus agendamentos</h1>
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você não tem horários marcados.
          </p>
        )}
        {upcoming.map((a) => (
          <AppointmentCard
            key={a.id}
            id={a.id}
            serviceName={a.service.name}
            startsAtIso={a.startsAt.toISOString()}
          />
        ))}
      </section>

      {history.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {history.map((a) => (
              <li key={a.id}>
                {fmt(a.startsAt)} · {a.service.name} ·{" "}
                {a.status === "CANCELED" ? "Cancelado" : "Realizado"}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}