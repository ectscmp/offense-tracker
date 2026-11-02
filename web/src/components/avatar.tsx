import { initialsOf } from "@/lib/format";

export function Avatar({
  name,
  color = "#6366f1",
  size = "md",
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [firstName = "", lastName = ""] = name.split(" ");
  const initials = initialsOf({ firstName, lastName }) || name.slice(0, 2).toUpperCase();
  const dimensions = size === "sm" ? "h-8 w-8 text-[10px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-xs";

  return (
    <span
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-tight text-white`}
      style={{ background: color }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
