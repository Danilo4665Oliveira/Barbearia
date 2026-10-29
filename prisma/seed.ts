import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Serviços (valores em centavos)
  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({
      data: [
        { name: "Corte", durationMin: 30, priceCents: 4000 },
        { name: "Barba", durationMin: 30, priceCents: 3000 },
        { name: "Corte + Barba", durationMin: 60, priceCents: 6500 },
      ],
    });
  }

  // Barbeiro
  let barber = await prisma.barber.findFirst();
  if (!barber) {
    barber = await prisma.barber.create({
      data: {
        name: "Barbeiro",
        whatsapp: process.env.BARBER_WHATSAPP!,
      },
    });
  }

  // Horário de funcionamento: terça a sábado, 09:00 às 18:00
  for (const weekday of [2, 3, 4, 5, 6]) {
    await prisma.businessHours.upsert({
      where: { barberId_weekday: { barberId: barber.id, weekday } },
      update: {},
      create: {
        barberId: barber.id,
        weekday,
        startTime: "09:00",
        endTime: "18:00",
      },
    });
  }

  // Seu usuário como admin
  if (process.env.ADMIN_EMAIL) {
    await prisma.user.updateMany({
      where: { email: process.env.ADMIN_EMAIL },
      data: { role: "ADMIN" },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
