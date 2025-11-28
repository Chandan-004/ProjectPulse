import { Inngest } from "inngest";
import prisma from "../configs/prismaClient.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-mgmt" });

// Inngest function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-with-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email_addresses[0]?.email_address, // FIXED
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
    const { data } = event;
    await prisma.user.delete({
      where: { id: data.id },
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
        email: data.email_addresses[0]?.email_address, // FIXED
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

const syncUserLogin = inngest.createFunction(
  { id: "sync-user-login" },
  { event: "clerk/session.created" },
  async ({ event }) => {
    const { data } = event;
    console.log("🔵 User Logged In:", data.user_id);

    // optional DB tracking future
    // await prisma.loginLogs.create({ data: { userId: data.user_id, type: "login" } });
  }
);

// ====================== USER LOGOUT ======================
const syncUserLogout = inngest.createFunction(
  { id: "sync-user-logout" },
  { event: "clerk/session.ended" },
  async ({ event }) => {
    const { data } = event;
    console.log("🟠 User Logged Out:", data.user_id);

  }
);

// Export functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation];
