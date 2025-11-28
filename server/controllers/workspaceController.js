import prisma from "../configs/prismaClient.js";

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

    const workspaces = await prisma.workspace.findMany({
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

    return res.json({ workspaces });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.code || error.message });
  }
};

export const addMember = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { email, role, workspaceId, message } = req.body;

    if (!workspaceId || !role) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true }
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isAdmin = workspace.members.find(
      (m) => m.userId === userId && m.role === "ADMIN"
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "You are not admin" });
    }

    const existingMember = workspace.members.find(
      (m) => m.userId === user.id
    );

    if (existingMember) {
      return res.status(400).json({ message: "User already a member" });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
        message
      }
    });

    return res.json({ member, message: "Member added successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.code || error.message });
  }
};
