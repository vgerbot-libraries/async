export interface Task {
	id: string;
	title: string;
	status: "todo" | "in-progress" | "done" | "expired" | "deleted";
	createdAt: Date;
}

export const tasks: Task[] = [];

export function addTask(title: string) {
	const id =
		Date.now().toString(36) + Math.random().toString(36).replace(".", "");
	tasks.push({
		id,
		title,
		status: "todo",
		createdAt: new Date(),
	});
}
