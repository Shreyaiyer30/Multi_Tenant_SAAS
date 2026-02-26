import api from "@/api/api";

const toBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
};

export const mapLoginPayload = (payload = {}) => ({
  email: payload.email ?? "",
  password: payload.password ?? ""
});

export const mapRegisterPayload = (payload = {}) => ({
  email: payload.email ?? "",
  password: payload.password ?? "",
  first_name: payload.first_name ?? payload.firstName ?? "",
  last_name: payload.last_name ?? payload.lastName ?? "",
  create_workspace: toBool(payload.create_workspace ?? payload.createWorkspace, false),
  workspace_name: payload.workspace_name ?? payload.workspaceName ?? ""
});

const jsonHeaders = { "Content-Type": "application/json" };

export const loginRequest = (payload) =>
  api.post("auth/login/", mapLoginPayload(payload), { headers: jsonHeaders });

export const registerRequest = (payload) =>
  api.post("auth/register/", mapRegisterPayload(payload), { headers: jsonHeaders });
