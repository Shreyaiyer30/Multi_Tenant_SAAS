import api from "@/api/api";

export const createOrder = async (plan) => {
  const payload =
    typeof plan === "string"
      ? { plan }
      : {
          plan: plan?.code || plan?.plan || "",
          plan_id: plan?.id || plan?.plan_id || null
        };

  const { data } = await api.post("billing/create-order/", payload);
  return data;
};

export default {
  createOrder
};
