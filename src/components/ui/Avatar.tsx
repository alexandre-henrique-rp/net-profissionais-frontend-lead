export type AvatarSize = "sm" | "md" | "lg";

const SIZES: Record<AvatarSize, string> = {
	sm: "size-9 text-[13px]",
	md: "size-9 text-[13px]",
	lg: "size-11 text-[15px]",
};

const BACKGROUNDS = [
	"bg-accent-500",
	"bg-success-500",
	"bg-primary-500",
	"bg-brand-500",
];

export interface AvatarProps {
	name: string;
	size?: AvatarSize;
	tone?: "accent" | "success" | "info" | "brand";
	className?: string;
}

/** Iniciais em círculo — mesma leitura do board de navegação do Penpot. */
export function Avatar({
	name,
	size = "md",
	tone,
	className = "",
}: AvatarProps) {
	const initials = name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");

	const color = tone
		? `bg-${tone}-500`
		: BACKGROUNDS[name.length % BACKGROUNDS.length];

	return (
		<span
			aria-hidden
			className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${SIZES[size]} ${color} ${className}`}
		>
			{initials}
		</span>
	);
}
