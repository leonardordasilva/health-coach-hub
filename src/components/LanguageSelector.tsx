import { useLanguage, type Language } from "@/i18n";
import { cn } from "@/lib/utils";

const options: { value: Language; label: string }[] = [
  { value: "pt", label: "PT" },
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

interface Props {
  className?: string;
}

export default function LanguageSelector({ className }: Props) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLanguage(opt.value)}
          className={cn(
            "px-2 py-1 rounded-md text-xs font-semibold transition-all",
            language === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
