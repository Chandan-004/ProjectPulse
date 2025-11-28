import express from "express"
import { createUserWorkspace, getUserWorkspace } from "../controllers/workspaceController.js"

const workspaceRouter = express.Router()

workspaceRouter.get('/', getUserWorkspace)
workspaceRouter.post('/', getUserWorkspace)


export default workspaceRouter