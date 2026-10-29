"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAppointment, fetchSlots } from "./actions";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hourLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });

export function AgendarForm({
  barberId,
  services,
}: {
  barberId: string;
  services: Service[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Recife",
  });

  function loadSlots(nextService: string, nextDate: string) {
    setSelected(null);
    setMessage(null);
    if (!nextService || !nextDate) {
      setSlots([]);
      return;
    }
    startTransition(async () => {
      setSlots(await fetchSlots(barberId, nextService, nextDate));
    });
  }

  function confirm() {
    if (!selected) return;
    startTransition(async () => {
      const res = await createAppointment({
        barberId,
        serviceId,
        startsAtIso: selected,
      });
      if (res.ok) {
        setMessage("Agendamento confirmado!");
        setSelected(null);
      } else {
        setMessage(res.error);
      }
      setSlots(await fetchSlots(barberId, serviceId, date));
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Serviço</Label>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <Button
              key={s.id}
              type="button"
              variant={s.id === serviceId ? "default" : "outline"}
              onClick={() => {
                setServiceId(s.id);
                loadSlots(s.id, date);
              }}
            >
              {s.name} · {money(s.priceCents)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Dia</Label>
        <Input
          id="date"
          type="date"
          min={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            loadSlots(serviceId, e.target.value);
          }}
        />
      </div>

      {date && (
        <div className="space-y-2">
          <Label>Horários</Label>
          {slots.length === 0 && !pending ? (
            <p className="text-sm text-muted-foreground">
              Sem horários livres nesse dia.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((iso) => (
                <Button
                  key={iso}
                  type="button"
                  variant={iso === selected ? "default" : "outline"}
                  onClick={() => setSelected(iso)}
                >
                  {hourLabel(iso)}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={confirm} disabled={!selected || pending}>
        {pending ? "Aguarde..." : "Confirmar agendamento"}
      </Button>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}