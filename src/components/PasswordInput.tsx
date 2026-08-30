"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ChangeEvent } from "react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
};

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
}: Props) {
  const [visible, setVisible] = useState(false);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <label className="block" htmlFor={id}>
      <span className="text-xs font-semibold text-klir-ink/55">{label}</span>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          minLength={minLength}
          value={value}
          onChange={handleChange}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 pr-10 text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-klir-ink/45 hover:text-klir-primary transition"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </label>
  );
}
