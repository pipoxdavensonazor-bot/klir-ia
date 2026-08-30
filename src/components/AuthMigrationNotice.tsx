export default function AuthMigrationNotice() {
  return (
    <div className="mb-4 rounded-lg border border-klir-accent/30 bg-klir-accent/10 px-3 py-2 text-xs text-klir-ink/70">
      <strong className="text-klir-primary">Comptes mis à jour.</strong> Si vous utilisiez l’ancienne connexion
      Clerk, créez un nouveau compte avec le même courriel ou utilisez « Mot de passe oublié » après inscription.
    </div>
  );
}
