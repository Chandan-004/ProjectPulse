import { Inngest } from "inngest";
import prisma from "../configs/prismaClient.js";

export const inngest = new Inngest({ id: "project-mgmt" });

/* =============== USER SYNC ================== */
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-with-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email_addresses[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await prisma.user.delete({
      where: { id: event.data.id },
    });
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-with-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data.email_addresses[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

/* =============== AUTH EVENTS ================== */
const syncUserLogin = inngest.createFunction(
  { id: "sync-user-login" },
  { event: "clerk/session.created" },
  async ({ event }) => {
    console.log("🔵 User Logged In:", event.data.user_id);
  }
);

const syncUserLogout = inngest.createFunction(
  { id: "sync-user-logout" },
  { event: "clerk/session.ended" },
  async ({ event }) => {
    console.log("🟠 User Logged Out:", event.data.user_id);
  }
);

/* =============== WORKSPACE / ORG ================== */
const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const org = event.data;

    // FIXED → Correct ownerId mapping
    const ownerId = org.membership?.public_user_data?.user_id;

    if (!ownerId) {
      console.error("❌ ownerId missing in Clerk organization event");
      return;
    }

    const workspace = await prisma.workspace.create({
      data: {
        id: org.id,
        name: org.name,
        image: org.logo_url,
        ownerId,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        userId: ownerId,
        workspaceId: org.id,
        role: "ADMIN",
      },
    });

    console.log("✔ Workspace synced from Clerk:", workspace.id);
  }
);

const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const org = event.data;

    await prisma.workspace.update({
      where: { id: org.id },
      data: {
        name: org.name,
        image: org.logo_url,
      },
    });

    console.log("🟢 Workspace updated:", org.id);
  }
);


const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    await prisma.workspace.delete({
      where: { id: event.data.id },
    });
  }
);

const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncUserLogin,
  syncUserLogout,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
];
