import { BaseModel } from "./BaseModel";
import { getFromStorage, addToStorage } from "../utils";

export class User extends BaseModel {
  constructor(login, password) {
    super();
    this.login = login;
    this.password = password;
    this.storageKey = "users";
	this.adminStorageKey = "admins";
  }
  get hasAccess() {
    let users = getFromStorage(this.storageKey);
    if (users.length == 0) return false;
    for (let user of users) {
      if (user.login === this.login && user.password === this.password) {
        this.id = user.id;
        return true;
      }
    }
    return false;
  }
  get hasAdminAccess() {
	let admins = getFromStorage(this.adminStorageKey);
	if (admins.length == 0) return false;
	for (let admin of admins) {
	  if (admin.login === this.login && admin.password === this.password) {
		this.id = admin.id;
		return true;
	  }
	}
	return false;
  }
  static save(user) {
    try {
      addToStorage(user, user.storageKey);
      return true;
    } catch (e) {
      throw new Error(e);
    }
  }
  static get(id) {
	let users = getFromStorage(User.storageKey);
	let admins = getFromStorage(User.adminStorageKey);
	users = users.concat(admins);
	for (let user of users) {
		if (user.id === id) return user;
	}
	return null;
  }

  static get storageKey() { return "users"; }
  static get adminStorageKey() { return "admins"; }
}
