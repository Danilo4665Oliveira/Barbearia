import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

async function RequireAuth({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return <>{children}</>;
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