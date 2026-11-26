import api from "@/lib/api/axios";

export async function getAdminEditorInvitations(filters = {}) {
  const response = await api.get("/dashboard/admin/editor-invitations", {
    params: filters,
  });

  return response.data.data;
}

export async function createAdminEditorInvitation(payload) {
  const response = await api.post(
    "/dashboard/admin/editor-invitations",
    payload,
  );

  return response.data.data;
}

export async function revokeAdminEditorInvitation(invitationId) {
  const response = await api.patch(
    `/dashboard/admin/editor-invitations/${invitationId}/revoke`,
  );

  return response.data.data;
}

export async function acceptEditorInvitation(token) {
  const response = await api.post("/dashboard/editor-invitations/accept", {
    token,
  });

  return response.data.data;
}
