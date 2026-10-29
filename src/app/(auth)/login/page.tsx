import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/agendar" });
        }}
      >
        <Button type="submit">Entrar com Google</Button>
      </form>
    </main>
  );
}