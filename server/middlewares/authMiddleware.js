export const protect = async (req, res, next) => {
  try {
    const { userId } = await req.auth();
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  } catch (error) {
    return res.status(401).json({ message: error.code || error.message });
  }
};
