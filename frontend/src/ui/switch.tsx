type SwitchProps = {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function Switch({ checked, onCheckedChange }: SwitchProps) {
  return (
    <button
      type="button"
      className={`switch ${checked ? "is-on" : ""}`}
      aria-pressed={checked}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span className="switch-knob" />
    </button>
  );
}
