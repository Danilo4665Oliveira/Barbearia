import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

async function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <>
      <nav className="mx-auto flex max-w-xl items-center justify-between p-4">
        <div className="flex gap-4 text-sm">
          <Link href="/agendar">Agendar</Link>
          <Link href="/meus-agendamentos">Meus agendamentos</Link>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </nav>
      {children}
    </>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="p-4">Carregando...</p>}>
      <RequireAuth>{children}</RequireAuth>
    </Suspense>
  );
}