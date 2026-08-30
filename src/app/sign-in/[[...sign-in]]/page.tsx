import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-klir-canvas px-4">
      <Suspense fallback={<div className="text-sm text-klir-ink/50">Chargement…</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
