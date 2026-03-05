import api from "@/api/api";

export const mapLoginPayload = (payload = {}) => ({
  email: payload.email ?? "",
  password: payload.password ?? ""
});

export const mapRegisterPayload = (payload = {}) => ({
  email: payload.email ?? "",
  password: payload.password ?? "",
  first_name: payload.first_name ?? payload.firstName ?? "",
  last_name: payload.last_name ?? payload.lastName ?? "",
  invite_token: payload.invite_token ?? payload.inviteToken ?? undefined
});

const jsonHeaders = { "Content-Type": "application/json" };

export const loginRequest = (payload) =>
  api.post("auth/login/", mapLoginPayload(payload), { headers: jsonHeaders });

export const registerRequest = (payload) =>
  api.post("auth/register/", mapRegisterPayload(payload), { headers: jsonHeaders });
