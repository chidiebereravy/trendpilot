import api from "@/lib/api/axios";

export async function getReport(filters = {}) {
  const response = await api.get("/dashboard/reports", {
    params: filters,
  });

  return response.data.data;
}

export async function exportReport(filters = {}) {
  const response = await api.get("/dashboard/reports", {
    params: {
      ...filters,
      format: "csv",
    },
    responseType: "blob",
  });

  return {
    blob: response.data,
    headers: response.headers,
  };
}
