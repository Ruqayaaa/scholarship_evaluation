type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Checkbox({ checked, onCheckedChange }: Props) {
  return (
    <input
      className="chk"
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  );
}
