// This file works with left part of the footer.
import { appState, backlogDiv, finishedDiv } from "./app";

const footer = document.querySelector("footer");
const leftPart = footer.querySelector(".left");

export const toggleLeftPart = () => {
	let method = "toggle";
	if (appState.currentUser) {
		method = "remove";
	} else {
		method = "add";
	}

	leftPart.classList[method]("visibility-hidden");
};

export const hideLeftPart = () => {
	leftPart.classList.add("visibility-hidden");
};

export const showLeftPart = () => {
	leftPart.classList.remove("visibility-hidden");
};

export const updateTaskCountInfo = () => {
	const activeTasks = leftPart.querySelector("#app-active-tasks");
	const finishedTasks = leftPart.querySelector("#app-finished-tasks");
	const activeTasksCount = backlogDiv.querySelectorAll(".task").length;
	const finishedTasksCount = finishedDiv.querySelectorAll(".task").length;
	activeTasks.innerText = activeTasksCount;
	finishedTasks.innerText = finishedTasksCount;
};