import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import defaultTemplate from "./templates/default.html";
import loggedOutTemplate from "./templates/headerRight/loggedOut.html";
import loggedInTemplate from "./templates/headerRight/loggedIn.html";
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

const body = document.querySelector(".main");

const popup = document.querySelector(".popup-edit");
const popupClose = popup.querySelector(".popup-close");
const popupCancel = popup.querySelector("#popup-cancel");

[popupClose, popupCancel].forEach(element => {
	element.addEventListener("click", function () {
		body.classList.remove("popup-open");
	});
});

const popupSave = document.querySelector("#popup-save");
const popupDelete = document.querySelector("#popup-delete");

export const appState = new State();

const headerRightPart = document.querySelector("#header-right-part");
let loginForm = document.querySelector("#app-login-form");

const contentDiv = document.querySelector("#content");
contentDiv.innerHTML = defaultTemplate;

// generateTestUser(User);

const addLoginListener = () => {
  loginForm = document.querySelector("#app-login-form");
  if (!loginForm) return;
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const login = formData.get("login");
    const password = formData.get("password");
    
    const isAuthSuccess = authUser(login, password);
    
    let fieldHTMLContent = isAuthSuccess
      ? taskFieldTemplate
      : noAccessTemplate;
    let headerRightContent = isAuthSuccess
      ? loggedInTemplate
      : loggedOutTemplate;
    
    
    contentDiv.innerHTML = fieldHTMLContent;
    headerRightPart.innerHTML = headerRightContent;
    
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
      assignEventListeners(true);
    } else addLoginListener();
    
    toggleLeftPart();
  });
}

addLoginListener();
toggleLeftPart();

function updateTasks(taskDivs) {
	let tasks = getTasks();
	const currentID = appState.currentUser.id;
	tasks = tasks.filter(task => task.belongs_to === currentID);

	for (let i in taskDivs) {
		const currentTasks = tasks.filter(task => task.group === i);
		let toInsert = "";

		for (let task of currentTasks) {
			toInsert += `<li class="task" data-id="${task.id}" data-desc="${task.extended_description || ""}">${task.title}</li>`;
		}

		taskDivs[i].innerHTML = toInsert;
	}

	updateTaskCountInfo();
}

const buttonListenerStates = {
	backlog: false,
	ready: false,
	in_progress: false,
	finished: false
};

function assignEventListeners(isFirstTime = false) {
	// adding tasks
	((isFirstTime) => {
		const buttons = allDivs.map(div => div.querySelector(".add-button"));
		const { backlog, ready, in_progress: inProgress, finished } = getTaskDivs(divsObject);
		const submitButtons = allDivs.map(div => div.querySelector(".submit-button"));
		const addButtons = allDivs.map(div => div.querySelector(".add-button"));

		// backlog add button
		if (!buttonListenerStates.backlog) {
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
					assignEventListeners();
				}
			});

			buttonListenerStates.backlog = true;
		}

		if (!buttonListenerStates.ready) {
			 buttons[1].addEventListener("click", transferTaskListenerTemplate.bind(null, ready, "backlog", "ready", addButtons[1]));
			buttonListenerStates.ready = true;
		} if (!buttonListenerStates.in_progress) {
			 buttons[2].addEventListener("click", transferTaskListenerTemplate.bind(null, inProgress, "ready", "in_progress", addButtons[2]));
			buttonListenerStates.in_progress = true;
		} if (!buttonListenerStates.finished) {
			buttons[3].addEventListener("click", transferTaskListenerTemplate.bind(null, finished, "in_progress", "finished", addButtons[3]));
			buttonListenerStates.finished = true;
		}

		function transferTaskListenerTemplate(taskDiv, taskGroup, transferTo, addButton) {
			// use transferTaskListenerTemplate.bind(null, ...)
			const select = document.createElement("select");
			select.classList.add("add-task-select");
			const currentTasks = getTasks().filter(task => task.group === taskGroup && task.belongs_to === appState.currentUser.id);
			select.innerHTML = `<option disabled selected>Select task&hellip;</option>`
			currentTasks.forEach(task => {
				const option = document.createElement("option");
				option.value = task.id;
				option.textContent = task.title;
				select.appendChild(option);
			});
			
			if (isFirstTime) {
				taskDiv.appendChild(select);
			}

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
				assignEventListeners();
			});
		}
	})(isFirstTime);

	// user menu
	((isFirstTime) => {
		if (!isFirstTime) return;

		console.log(Math.random() + " user menu listener added!")
		const userMenu = document.querySelector(".user-menu");
		const menuList = userMenu.querySelector(".menu");
		const menuArrow = userMenu.querySelector(".arrow");

		userMenu.addEventListener("click", () => {
			menuList.classList.toggle("display-none");
			menuArrow.classList.toggle("active");
		});

		// logout button
		const logoutButton = menuList.querySelector("#app-logout-li");
		logoutButton.addEventListener("click", () => {
			appState.currentUser = null;
			const contentDiv = document.querySelector("#content");
			contentDiv.innerHTML = defaultTemplate;
			headerRightPart.innerHTML = loggedOutTemplate;
			toggleLeftPart();
			for (let i in buttonListenerStates) buttonListenerStates[i] = false;
			addLoginListener();
		});

		// blur listener
		window.addEventListener("click", (e) => {
			// credits: https://stackoverflow.com/questions/6856871/getting-the-parent-div-of-element#comment123149106_6857116
			if (e.target.closest(".user-menu") !== userMenu) {
				hideMenu();
			}
		});

		window.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				hideMenu();
			}
		});

		function hideMenu() {
			menuList.classList.add("display-none");
			menuArrow.classList.remove("active");
		}
	})(isFirstTime);

	// editing tasks
	(() => {
		let taskDivs = getTaskDivs(allDivs);
		for (let i in taskDivs) {
			for (let task of taskDivs[i].children) {
				task.addEventListener("click", () => {
					body.classList.add("popup-open");

					const thisTask = getTasks().find(t => t.id === task.dataset.id);

					const popupTitle = popup.querySelector("#popup-title");
					const popupDescription = popup.querySelector("#popup-description");

					console.log(task.dataset.desc)
					popupTitle.textContent = task.textContent;
					popupDescription.textContent = task.dataset.desc || "Enter description...";

					if (!task.dataset.desc) {
						popupDescription.addEventListener("click", () => {
							popupDescription.textContent = "";
						}, { once: true });
					}

					const saveFunction = () => {
						task.textContent = popupTitle.textContent;
						task.dataset.desc = popupDescription.textContent;
						thisTask.title = popupTitle.textContent;
						thisTask.belongsTo = appState.currentUser.id;
						thisTask.extendedDescription = popupDescription.textContent;
						console.log(popupDescription.textContent)
						thisTask.storageKey = Task.storageKey;
						Task.update(thisTask.id, thisTask);
						body.classList.remove("popup-open");
					};

					const deleteFunction = deleteTask.bind(task, saveFunction, popupSave);

					popupSave.addEventListener("click", saveFunction, { once: true });
					popupDelete.addEventListener("click", deleteFunction, { once: true });
				});
			}
		}
	})();
}

function getTaskDivs(divs) {
	return Object.fromEntries(Object.entries(divs).map(
		([key, value]) => [key, value.querySelector(".tasks")])
	);
}

function deleteTask(saveFn, saveButton) {
	body.classList.remove("popup-open");
	Task.deleteTask(this.dataset.id);
	updateTasks(getTaskDivs(divsObject));
	assignEventListeners();

	saveButton.removeEventListener("click", saveFn);
}