import type { ReactNode } from "react";
import { Dialog } from "./Dialog";

export interface DrawerProps {
	open: boolean;
	title: string;
	description?: string;
	onClose: () => void;
	children: ReactNode;
}

export function Drawer({
	open,
	title,
	description,
	onClose,
	children,
}: DrawerProps) {
	return (
		<Dialog
			open={open}
			title={title}
			description={description}
			onClose={onClose}
			className="!ml-auto !mr-0 !flex !h-[calc(100dvh-2rem)] !max-h-none !max-w-[480px] !flex-col !rounded-none"
		>
			{children}
		</Dialog>
	);
}
