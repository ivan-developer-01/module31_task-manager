import { addToStorage, replaceStorage, getTasks } from "../utils";
import { BaseModel } from "./BaseModel";

export class Task extends BaseModel {
	constructor(group, title, belongsTo, extendedDescription = "") {
		super();
		this.group = group;
		this.title = title;
		this.belongsTo = belongsTo;
		this.extendedDescription = extendedDescription;
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
			const { group, title, belongsTo: belongs_to, id, extendedDescription: extended_description } = task;
			addToStorage({ group, title, belongs_to, id, extended_description }, task.storageKey);
			return true;
		} catch (e) {
			throw new Error(e);
		}
	}

	static update(id, task) {
		try {
			const tasks = getTasks();
			const index = tasks.findIndex(task => task.id === id);
			const { group, title, belongsTo: belongs_to, id: id_, extendedDescription: extended_description } = task;
			tasks[index] = { group, title, belongs_to, id: id_, extended_description };
			replaceStorage(tasks, Task.storageKey);
			return true;
		} catch (e) {
			throw new Error(e);
		}
	}

	static get(id) {
		try {
			const tasks = getTasks();
			return tasks.find(task => task.id === id);
		} catch (e) {
			throw new Error(e);
		}
	}

	static deleteBelongsTo(id) {
		try {
			const tasks = getTasks();
			const filtered = tasks.filter(task => task.belongsTo !== id);
			replaceStorage(filtered, Task.storageKey);
			return true;
		} catch (e) {
			throw new Error(e);
		}
	}
}