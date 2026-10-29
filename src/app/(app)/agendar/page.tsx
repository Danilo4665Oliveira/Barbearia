import { prisma } from "@/lib/prisma";
import { AgendarForm } from "./agendar-form";

export default async function AgendarPage() {
  const [barber, services] = await Promise.all([
    prisma.barber.findFirst({ where: { active: true } }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
  ]);

  if (!barber) return <p className="p-4">Nenhum barbeiro disponível.</p>;

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Agendar horário</h1>
      <AgendarForm barberId={barber.id} services={services} />
    </main>
  );
}