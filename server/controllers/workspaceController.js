import prisma from "../configs/prismaClient.js";
import { clerkClient } from "@clerk/express";

export const createUserWorkspace = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: [{ userId, role: "ADMIN" }]
        }
      }
    });

    return res.json({ workspace });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.code || error.message });
  }
};

export const getUserWorkspace = async (req, res) => {
  try {
    const { userId } = await req.auth();

    // 1. Pehle apne database (Prisma) mein check karo
    let workspaces = await prisma.workspace.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: { include: { user: true } }
              }
            }
          }
        },
        owner: true
      }
    });

    // 2. [SYNC LOGIC] Agar Database khali hai, par Clerk par Org ho sakti hai
    if (workspaces.length === 0) {
      console.log("Database empty. Checking Clerk for sync...");
      
      // Clerk se pucho ki is user ki memberships kya hain
      const clerkMemberships = await clerkClient.users.getOrganizationMembershipList({ userId });

      if (clerkMemberships.data.length > 0) {
        const syncPromises = clerkMemberships.data.map(async (mem) => {
            const org = mem.organization;
            
            // Database mein Org create/update karo (Upsert)
            // Dhyaan rahe: Agar org pehle se hai to crash na ho, isliye upsert use karein
            // Note: Tumhara schema shayad 'id' Clerk ki OrgId se match karta ho ya nahi.
            // Yahan hum maan rahe hain ki tum naya bana rahe ho.
            
            // Check if workspace exists locally (by name or specific ID logic)
            // Yahan hum simple create try kar rahe hain agar nahi mila
            
            // Behtar hai ki tumhara workspace model Clerk ki OrgID store kare.
            // Assuming tum name se sync kar rahe ho abhi ke liye:
            
            return prisma.workspace.create({
                data: {
                    name: org.name,
                    ownerId: userId, // Filhal current user ko owner bana rahe hain sync ke liye
                    members: {
                        create: [{ userId, role: "ADMIN" }]
                    }
                }
            });
        });

        // Sab sync hone ka wait karo
        await Promise.all(syncPromises);

        // 3. Sync ke baad Dobaara fetch karo
        workspaces = await prisma.workspace.findMany({
            where: { members: { some: { userId } } },
            include: {
                members: { include: { user: true } },
                // ... baaki includes
                owner: true
            }
        });
      }
    }

    return res.json({ workspaces });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.code || error.message });
  }
};
