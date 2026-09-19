import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRefreshData } from "@/hooks/use-data";
import { saveClient, type ClientInput } from "@/lib/api/clients";
import type { Client } from "@/lib/types";

/** New client, or edit an existing one when `client` is given. */
export function ClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client?: Client | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* keyed so the form resets whenever it opens for a different client */}
        {open ? (
          <ClientForm
            key={client?.id ?? "new"}
            client={client}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({
  client,
  onDone,
}: {
  client: Client | undefined;
  onDone: () => void;
}) {
  const refresh = useRefreshData();
  const [form, setForm] = useState<ClientInput>({
    ...(client ? { id: client.id } : {}),
    name: client?.name ?? "",
    city: client?.city ?? "",
    contact: client?.contact ?? "",
    monthlyValue: client?.monthlyValue ?? 0,
    contractUntil: client?.contractUntil ?? "",
    health: client?.health ?? "good",
  });
  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: () => saveClient({ data: form }),
    onSuccess: async () => {
      await refresh();
      toast.success(client ? "Client updated" : `${form.name} added`);
      onDone();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>
          {client ? `Edit ${client.name}` : "New client"}
        </DialogTitle>
        <DialogDescription>
          {client
            ? "Changes are saved for everyone."
            : "Add the client first, then map their first site on the Projects page."}
        </DialogDescription>
      </DialogHeader>

      <Field label="Company or client name">
        <Input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Kalamaja Apartments"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <Input
            required
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Tallinn"
          />
        </Field>
        <Field label="Contact person">
          <Input
            value={form.contact}
            onChange={(e) => set("contact", e.target.value)}
            placeholder="Name"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Monthly value (€)">
          <Input
            type="number"
            min={0}
            step={10}
            value={form.monthlyValue}
            onChange={(e) => set("monthlyValue", Number(e.target.value))}
          />
        </Field>
        <Field label="Contract until">
          <Input
            type="date"
            value={form.contractUntil}
            onChange={(e) => set("contractUntil", e.target.value)}
          />
        </Field>
        <Field label="Health">
          <Select
            value={form.health}
            onValueChange={(v) => set("health", v as ClientInput["health"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="watch">Watch</SelectItem>
              <SelectItem value="at risk">At risk</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {client ? "Save changes" : "Add client"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
