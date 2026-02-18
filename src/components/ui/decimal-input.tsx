import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DecimalInputProps {
  id?: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  decimals?: number; // max decimal places
  required?: boolean;
  disabled?: boolean;
}

/**
 * Input numérico com máscara decimal:
 * - Aceita vírgula OU ponto como separador
 * - Mostra vírgula para o usuário (padrão BR)
 * - Emite valor com ponto para o onChange (compatível com parseFloat)
 * - Limita casas decimais conforme `decimals` prop (padrão: 1)
 */
export function DecimalInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  min,
  max,
  decimals = 1,
  required,
  disabled,
}: DecimalInputProps) {
  // Display value uses comma as separator
  const toDisplay = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined || v === "") return "";
    return String(v).replace(".", ",");
  };

  const [display, setDisplay] = useState<string>(toDisplay(value));
  const skipSync = useRef(false);

  // Sync from external value changes (e.g. profile load)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Allow only digits, comma and period
    raw = raw.replace(/[^0-9.,]/g, "");

    // Replace period with comma (normalise to comma for display)
    raw = raw.replace(".", ",");

    // Allow only one comma
    const parts = raw.split(",");
    if (parts.length > 2) {
      raw = parts[0] + "," + parts.slice(1).join("");
    }

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > decimals) {
      raw = parts[0] + "," + parts[1].slice(0, decimals);
    }

    setDisplay(raw);
    skipSync.current = true;

    // Emit value with period for parseFloat compatibility
    const emitValue = raw.replace(",", ".");
    onChange(emitValue);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(className)}
      required={required}
      disabled={disabled}
      min={min}
      max={max}
    />
  );
}
