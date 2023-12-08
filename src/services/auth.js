import { appState } from "../app";
import { User } from "../models/User";

export const authUser = function (login, password) {
  const user = new User(login, password);
  if (!user.hasAccess && !user.hasAdminAccess) return false;
  appState.currentUser = user;
  return true;
};

export const isUserAdmin = function () {
  return appState.currentUser.hasAdminAccess;
};