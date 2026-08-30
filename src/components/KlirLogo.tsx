import Image from "next/image";

type KlirLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** Logo officiel Klir IA (PNG carré avec fond blanc arrondi). */
export default function KlirLogo({ size = 32, className = "", priority = false }: KlirLogoProps) {
  return (
    <Image
      src="/klir-ia-logo.jpg"
      alt="Klir IA"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
