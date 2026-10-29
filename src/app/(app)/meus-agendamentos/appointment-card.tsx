"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cancelAppointment,
  fetchRescheduleSlots,
  rescheduleAppointment,
} from "./actions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });

const hour = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });

export function AppointmentCard({
  id,
  serviceName,
  startsAtIso,
}: {
  id: string;
  serviceName: string;
  startsAtIso: string;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Recife",
  });

  function onCancel() {
    if (!window.confirm("Cancelar este agendamento?")) return;
    startTransition(async () => {
      const res = await cancelAppointment(id);
      if (!res.ok) setMessage(res.error);
    });
  }

  function onPickDate(value: string) {
    setDate(value);
    setSelected(null);
    setMessage(null);
    if (!value) return setSlots([]);
    startTransition(async () => {
      setSlots(await fetchRescheduleSlots(id, value));
    });
  }

  function onConfirmReschedule() {
    if (!selected) return;
    startTransition(async () => {
      const res = await rescheduleAppointment(id, selected);
      if (res.ok) {
        setRescheduling(false);
        setMessage(null);
      } else {
        setMessage(res.error);
        setSlots(await fetchRescheduleSlots(id, date));
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="font-medium">{serviceName}</p>
        <p className="text-sm capitalize text-muted-foreground">
          {when(startsAtIso)}
        </p>
      </div>

      {!rescheduling && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setRescheduling(true)}
          >
            Remarcar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      )}

      {rescheduling && (
        <div className="space-y-3">
          <Input
            type="date"
            min={today}
            value={date}
            onChange={(e) => onPickDate(e.target.value)}
          />
          {date && slots.length === 0 && !pending && (
            <p className="text-sm text-muted-foreground">
              Sem horários livres nesse dia.
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {slots.map((iso) => (
              <Button
                key={iso}
                type="button"
                size="sm"
                variant={iso === selected ? "default" : "outline"}
                onClick={() => setSelected(iso)}
              >
                {hour(iso)}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!selected || pending}
              onClick={onConfirmReschedule}
            >
              Confirmar novo horário
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRescheduling(false)}
            >
              Voltar
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-red-500">{message}</p>}
    </div>
  );
}