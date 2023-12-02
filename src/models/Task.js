import { addToStorage, replaceStorage, getTasks } from "../utils";
import { BaseModel } from "./BaseModel";

export class Task extends BaseModel {
	constructor(group, title, belongsTo) {
		super();
		this.group = group;
		this.title = title;
		this.belongsTo = belongsTo;
		this.storageKey = "tasks";
	}

	static get storageKey() {
		return "tasks";
	}

	static deleteTask(id) {
		try {
			const tasks = getTasks();
			const filtered = tasks.filter(task => task.id !== id);
			replaceStorage(filtered, Task.storageKey);
			return true;
		} catch (e) {
			throw new Error(e);
		}
	}

	static save(task) {
		try {
			const { group, title, belongsTo: belongs_to, id } = task;
			addToStorage({ group, title, belongs_to, id }, task.storageKey);
			return true;
		} catch (e) {
			throw new Error(e);
		}
	}
}