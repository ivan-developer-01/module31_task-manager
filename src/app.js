import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import { User } from "./models/User";
import { Task } from "./models/Task";
import { generateTestUser, getTasks } from "./utils";
import { State } from "./state";
import { authUser } from "./services/auth";
export let backlogDiv = null;
export let readyDiv = null;
export let inProgressDiv = null;
export let finishedDiv = null;
import { toggleLeftPart, updateTaskCountInfo } from "./leftPart";

let allDivs = [backlogDiv, readyDiv, inProgressDiv, finishedDiv];
const divsObject = {
	get ready() { return readyDiv; },
	get backlog() { return backlogDiv; },
	get in_progress() { return inProgressDiv; },
	get finished() { return finishedDiv; }
};

export const appState = new State();

const loginForm = document.querySelector("#app-login-form");

// generateTestUser(User);

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const login = formData.get("login");
  const password = formData.get("password");
  const contentDiv = document.querySelector("#content");

  const isAuthSuccess = authUser(login, password);

  let fieldHTMLContent = isAuthSuccess
    ? taskFieldTemplate
    : noAccessTemplate;

  contentDiv.innerHTML = fieldHTMLContent;

  if (isAuthSuccess) {
    backlogDiv = contentDiv.querySelector(".backlog");
    readyDiv = contentDiv.querySelector(".ready");
    inProgressDiv = contentDiv.querySelector(".in-progress");
    finishedDiv = contentDiv.querySelector(".finished");
    allDivs = [backlogDiv, readyDiv, inProgressDiv, finishedDiv];
    let divs = {};
    for (let key in divsObject) divs[key] = divsObject[key];
    divs = getTaskDivs(divs);
    updateTasks(divs);
    updateTaskCountInfo();
    assignEventListeners();
  }

  toggleLeftPart();
});

toggleLeftPart();

function updateTasks(taskDivs) {
	let tasks = getTasks();
	const currentID = appState.currentUser.id;
	tasks = tasks.filter(task => task.belongs_to === currentID);

	for (let i in taskDivs) {
		const currentTasks = tasks.filter(task => task.group === i);
		let toInsert = "";

		for (let task of currentTasks) {
			toInsert += `<li class="task" data-id="${task.id}">${task.title}</li>`;
		}

		taskDivs[i].innerHTML = toInsert;
	}

	updateTaskCountInfo();
}

function assignEventListeners() {
	const buttons = allDivs.map(div => div.querySelector(".add-button"));
	const { backlog, ready, in_progress: inProgress, finished } = getTaskDivs(divsObject);
	const submitButtons = allDivs.map(div => div.querySelector(".submit-button"));
	const addButtons = allDivs.map(div => div.querySelector(".add-button"));

	// backlog add button
	buttons[0].addEventListener("click", function () {
		const inputWrapper = document.createElement("li");
		inputWrapper.classList.add("add-input");
		const input = document.createElement("input")
		input.classList.add("add-input-input");
		input.placeholder = "Enter task...";
		input.type = "text";
		inputWrapper.appendChild(input);
		backlog.appendChild(inputWrapper);
		input.focus();
		
		let btns = [submitButtons[0], addButtons[0]];
		
		btns.forEach(button => button.classList.toggle("display-none"));
		
		btns[0].addEventListener("click", addTask);
		input.addEventListener("blur", addTask);
		input.addEventListener("keydown",  (e) => {
			if (e.key === "Enter") addTask();
		});

		function addTask() {
			if (!input.value) return false;
			const task = new Task("backlog", input.value, appState.currentUser.id);
			Task.save(task);
			updateTasks(getTaskDivs(divsObject));
			btns.forEach(button => button.classList.toggle("display-none"));
		}
	});

	// ready add button
	// buttons[1].addEventListener("click", function () {
	// 	const select = document.createElement("select");
	// 	select.classList.add("add-task-select");
	// 	const backlogTasks = getTasks().filter(task => task.group === "backlog");
	// 	backlogTasks.forEach(task => {
	// 		const option = document.createElement("option");
	// 		option.value = task.id;
	// 		option.textContent = task.title;
	// 		select.appendChild(option);
	// 	});
	// 	ready.appendChild(select);

	// 	let btns = [submitButtons[1], addButtons[1]];
	// 	btns.forEach(button => button.classList.toggle("display-none"));
		
	// 	btns[0].addEventListener("click", () => {
	// 		const task = JSON.parse(JSON.stringify(getTasks().find(task => task.id === select.value)));
	// 		Task.deleteTask(select.value)
	// 		task.belongsTo = task.belongs_to;
	// 		delete task.belongs_to;
	// 		task.storageKey = Task.storageKey;
	// 		task.group = "ready";
	// 		Task.save(task);
	// 		updateTasks(getTaskDivs(divsObject));
	// 		btns.forEach(button => button.classList.toggle("display-none"));
	// 	});
	// });

	buttons[1].addEventListener("click", transferTaskListenerTemplate.bind(null, ready, "backlog", "ready", addButtons[1]));
	buttons[2].addEventListener("click", transferTaskListenerTemplate.bind(null, inProgress, "ready", "in_progress", addButtons[2]));
	buttons[3].addEventListener("click", transferTaskListenerTemplate.bind(null, finished, "in_progress", "finished", addButtons[3]));

	function transferTaskListenerTemplate(taskDiv, taskGroup, transferTo, addButton) {
		// use transferTaskListenerTemplate.bind(null, ...)
		const select = document.createElement("select");
		select.classList.add("add-task-select");
		const currentTasks = getTasks().filter(task => task.group === taskGroup);
		select.innerHTML = `<option disabled selected>Select task&hellip;</option>`
		currentTasks.forEach(task => {
			const option = document.createElement("option");
			option.value = task.id;
			option.textContent = task.title;
			select.appendChild(option);
		});
		taskDiv.appendChild(select);

		addButton.classList.add("display-none");
		
		select.addEventListener("input", () => {
			const task = JSON.parse(JSON.stringify(getTasks().find(task => task.id === select.value)));
			Task.deleteTask(select.value)
			task.belongsTo = task.belongs_to;
			delete task.belongs_to;
			task.storageKey = Task.storageKey;
			task.group = transferTo;
			Task.save(task);
			updateTasks(getTaskDivs(divsObject));
			addButton.classList.remove("display-none");
		});
	}
}

function getTaskDivs(divs) {
	return Object.fromEntries(Object.entries(divs).map(
		([key, value]) => [key, value.querySelector(".tasks")])
	);
}