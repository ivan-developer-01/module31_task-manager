import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";
import "./styles/admin.css";
import taskFieldTemplate from "./templates/taskField.html";
import noAccessTemplate from "./templates/noAccess.html";
import userMgmtTemplate from "./templates/userMgmt.html"
import defaultTemplate from "./templates/default.html";
import loggedOutTemplate from "./templates/headerRight/loggedOut.html";
import loggedInTemplate from "./templates/headerRight/loggedIn.html";
import { User } from "./models/User";
import { Task } from "./models/Task";
import { generateTestUser, getFromStorage, getTasks } from "./utils";
import { State } from "./state";
import { authUser, isUserAdmin } from "./services/auth";
export let backlogDiv = null;
export let readyDiv = null;
export let inProgressDiv = null;
export let finishedDiv = null;
import { hideLeftPart, showLeftPart, toggleLeftPart, updateTaskCountInfo } from "./leftPart";
import { v4 as uuidv4 } from "uuid";

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
if (!localStorage.getItem("users")) generateTestUser(User);
// admins
if (!localStorage.getItem("admins")) {
	const firstAdmin = new User("admin", "admin", true);
	User.save(firstAdmin);
}

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
      if (isUserAdmin()) body.classList.add("admin");
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
	if (!isUserAdmin()) tasks = tasks.filter(task => task.belongs_to === currentID);

	for (let i in taskDivs) {
		const currentTasks = tasks.filter(task => task.group === i);
		let toInsert = "";

		for (let task of currentTasks) {
			try {
				toInsert += `
				<li
					class="task"
					data-belongs-to="${task.belongs_to}"
					${isUserAdmin() ? 'data-belongs-login="' + User.get(task.belongs_to).login + '"' : ""}
					data-id="${task.id}"
					data-desc="${task.extended_description || ""}"
					draggable="true"
					data-group="${task.group}"
				>${task.title}</li>`;
			} catch (error) {}
		}

		taskDivs[i].innerHTML = toInsert;
	}

	updateTaskCountInfo();
	toggleButtonDisable();
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

				let taskAddedSwitch = false;
				
				btns[0].addEventListener("click", addTask);
				input.addEventListener("blur", addTask);
				input.addEventListener("keydown",  (e) => {
					if (e.key === "Enter") addTask();
				});

				function addTask() {
					if (!input.value || taskAddedSwitch) return false;
					taskAddedSwitch = true;
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
			let currentTasks = getTasks().filter(task => task.group === taskGroup);
			if (!isUserAdmin()) currentTasks = currentTasks.filter(task => task.belongs_to === appState.currentUser.id);
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
				task.extendedDescription = task.extended_description;
				delete task.belongs_to;
				task.storageKey = Task.storageKey;
				task.group = transferTo;
				Task.save(task);
				updateTasks(getTaskDivs(divsObject));
				addButton.classList.remove("display-none");
				assignEventListeners();
			});
		}

		toggleButtonDisable();
	})(isFirstTime);

	// user menu
	((isFirstTime) => {
		if (!isFirstTime) return;

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
			body.classList.remove("admin");
			const contentDiv = document.querySelector("#content");
			contentDiv.innerHTML = defaultTemplate;
			headerRightPart.innerHTML = loggedOutTemplate;
			toggleLeftPart();
			for (let i in buttonListenerStates) buttonListenerStates[i] = false;
			addLoginListener();
		});

		if (isUserAdmin()) {
			const userManageLi = document.createElement("li");
			userManageLi.className = "menu-item";
			userManageLi.setAttribute("id", "app-usermgmt-li");
			userManageLi.textContent = "User mgmt";
			userManageLi.setAttribute("title", "Mgmt — management");

			userManageLi.addEventListener("click", () => {
				const contentDiv = document.querySelector("#content");
				contentDiv.innerHTML = userMgmtTemplate;
				
				hideLeftPart();
				
				const usersList = contentDiv.querySelector(".mgmt-list.users");
				const adminsList = contentDiv.querySelector(".mgmt-list.admins");

				const noUsersP = contentDiv.querySelector("#mgmt-no-users");
				const noAdminsP = contentDiv.querySelector("#mgmt-no-admins");
				
				const addUserButton = contentDiv.querySelector("#mgmt-add-user");
				const addAdminButton = contentDiv.querySelector("#mgmt-add-admin");
				
				const updateUsersList = updateList.bind(null, usersList, User.storageKey, "user", noUsersP);
				const updateAdminsList = updateList.bind(null, adminsList, User.adminStorageKey, "admin", noAdminsP);

				updateUsersList();
				updateAdminsList();

				addUserButton.addEventListener("click", () => {
					const login = prompt("User login:");
					const password = prompt("User password:");
					const user = new User(login, password);
					User.save(user);
					updateUsersList(usersList);
				});

				addAdminButton.addEventListener("click", () => {
					const login = prompt("Admin login:");
					const password = prompt("Admin password:");
					const user = new User(login, password, true);
					User.save(user);
					updateAdminsList(adminsList);
				});

				const backButton = contentDiv.querySelector("#mgmt-back");
				backButton.addEventListener("click", () => {
					contentDiv.innerHTML = taskFieldTemplate;
					backlogDiv = contentDiv.querySelector(".backlog");
					readyDiv = contentDiv.querySelector(".ready");
					inProgressDiv = contentDiv.querySelector(".in-progress");
					finishedDiv = contentDiv.querySelector(".finished");
					allDivs = [backlogDiv, readyDiv, inProgressDiv, finishedDiv];
					showLeftPart();
					for (let i in buttonListenerStates) buttonListenerStates[i] = false;
					updateTasks(getTaskDivs(divsObject));
					toggleButtonDisable();
					assignEventListeners();
				});
			});

			function updateList(list, key, liKey, noP) {
				const users = getFromStorage(key);
				list.innerHTML = "";
				if (users.length === 0) {
					noP.classList.remove("d-none");
					return;
				} else noP.classList.add("d-none");
				for (let user of users) {
					const li = document.createElement("li");
					const loginSpan    = document.createElement("span");
					const passwordSpan = document.createElement("span");
					const deleteButton = document.createElement("button");

					loginSpan.className = `mgmt-${liKey}-login`;
					passwordSpan.className = `mgmt-password`;
					deleteButton.className = `mgmt-${liKey}-delete btn btn-danger`;

					loginSpan.textContent = user.login;
					passwordSpan.textContent = user.password;

					deleteButton.innerHTML = "&times;";
					deleteButton.addEventListener("click", () => {
						User.delete(li.dataset.id);
						Task.deleteBelongsTo(li.dataset.id);
						updateList(list, key, liKey, noP);
					});

					li.className = "menu-item";
					li.dataset.id = user.id;

					loginSpan.textContent = user.login;
					li.appendChild(loginSpan);
					li.append(document.createTextNode(" - "));
					li.appendChild(passwordSpan);
					if (user.id === appState.currentUser.id) {
						li.innerHTML += " <i>(you)</i>";
						deleteButton.classList.add("d-none");
					}
					li.innerHTML += " ";
					li.appendChild(deleteButton);
					list.appendChild(li);
				}
			}

			menuList.prepend(userManageLi);
		}

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

					popupTitle.textContent = task.textContent;
					popupDescription.value = task.dataset.desc || "Enter description...";

					if (!task.dataset.desc) {
						popupDescription.addEventListener("click", () => {
							popupDescription.value = "";
						}, { once: true });
					}

					const saveFunction = () => {
						task.textContent = popupTitle.textContent;
						task.dataset.desc = popupDescription.value;
						thisTask.title = popupTitle.textContent;
						thisTask.belongsTo = task.dataset.belongsTo;
						thisTask.extendedDescription = popupDescription.value;
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

	// dragging tasks
	(() => {
		// add more allowed targets here
		const associations = {
			"backlog": ["ready"],
			"ready": ["backlog", "in_progress", "in-progress"],
			"in_progress": ["ready", "finished"],
			get "in-progress"() { return this.in_progress; },
			"finished": ["in_progress"],
		};

		let taskDivs = allDivs;
		for (let i in taskDivs) {
			const list = taskDivs[i].querySelector(".tasks");
			list.dataset.group = taskDivs[i].dataset.group;
			taskDivs[i].addEventListener("dragover", event => {
				event.preventDefault();
			});

			for (let task of list.children) {
				task.addEventListener("dragstart", (e) => {
					e.dataTransfer.setData("text/plain", task.dataset.id + "|" + task.dataset.group);
				});
			}

			taskDivs[i].addEventListener("drop", event => {
				const [ taskId, taskGroup ] = event.dataTransfer.getData("text/plain").split("|");
				if (
					!associations[event.target.dataset.group]?.includes(taskGroup) ||
					taskGroup.replaceAll("_", "-") === event.target.dataset.group) return false;
				const thisTask = Task.get(taskId);
				thisTask.group = event.target.dataset.group.replaceAll("-", "_");
				thisTask.extendedDescription = thisTask.extended_description;
				thisTask.belongsTo = thisTask.belongs_to;
				Task.update(taskId, thisTask);
				updateTasks(getTaskDivs(divsObject));
				assignEventListeners();
			});
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

function toggleButtonDisable() {
	const addButtons = allDivs.map(div => div.querySelector(".add-button"));
	let tasks = getTasks();
	if (!isUserAdmin()) tasks = tasks.filter(task => task.belongs_to === appState.currentUser.id);
	const backlogTasks = tasks.filter(task => task.group === "backlog");
	const readyTasks = tasks.filter(task => task.group === "ready");
	const inProgressTasks = tasks.filter(task => task.group === "in_progress");
	const finishedTasks = tasks.filter(task => task.group === "finished");

	const tasksArray = [backlogTasks, readyTasks, inProgressTasks, finishedTasks];
	for (let i in addButtons) {
		if (tasksArray[i - 1]?.length === 0) addButtons[i].setAttribute("disabled", true);
		else addButtons[i].removeAttribute("disabled");
	}
}