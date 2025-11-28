import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../configs/api.js";

export const fetchWorkspaces = createAsyncThunk(
  "workspaces/fetchWorkspaces",
  async ({ getToken }) => {
    try {
      const { data } = await api.get("/api/workspaces", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      return data.workspaces;
    } catch (error) {
      console.log(error?.response?.data?.message || error.message);
      throw error;
    }
  }
);

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
    },
    setCurrentWorkspace: (state, action) => {
      localStorage.setItem("currentWorkspaceId", action.payload);
      state.currentWorkspace = state.workspaces.find(
        (w) => w.id === action.payload
      );
    },
    addWorkspace: (state, action) => {
      state.workspaces.push(action.payload);
      state.currentWorkspace = action.payload;
    },
    updateWorkspace: (state, action) => {
      state.workspaces = state.workspaces.map((w) =>
        w.id === action.payload.id ? action.payload : w
      );
      if (state.currentWorkspace?.id === action.payload.id) {
        state.currentWorkspace = action.payload;
      }
    },
    deleteWorkspace: (state, action) => {
      state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
    },
    addProject: (state, action) => {
      state.currentWorkspace.projects.push(action.payload);
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? { ...w, projects: [...w.projects, action.payload] }
          : w
      );
    },
    addTask: (state, action) => {
      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) => {
          if (p.id === action.payload.projectId) {
            return { ...p, tasks: [...p.tasks, action.payload] };
          }
          return p;
        }
      );
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? { ...p, tasks: [...p.tasks, action.payload] }
                  : p
              ),
            }
          : w
      );
    },
    updateTask: (state, action) => {
      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.id === action.payload.id ? action.payload : t
                ),
              }
            : p
      );
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === action.payload.projectId
                  ? {
                      ...p,
                      tasks: p.tasks.map((t) =>
                        t.id === action.payload.id ? action.payload : t
                      ),
                    }
                  : p
              ),
            }
          : w
      );
    },
    deleteTask: (state, action) => {
      const { projectId, taskIds } = action.payload;
      state.currentWorkspace.projects = state.currentWorkspace.projects.map(
        (p) =>
          p.id === projectId
            ? { ...p, tasks: p.tasks.filter((t) => !taskIds.includes(t.id)) }
            : p
      );
      state.workspaces = state.workspaces.map((w) =>
        w.id === state.currentWorkspace.id
          ? {
              ...w,
              projects: w.projects.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      tasks: p.tasks.filter((t) => !taskIds.includes(t.id)),
                    }
                  : p
              ),
            }
          : w
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      state.workspaces = action.payload;
      if (action.payload.length > 0) {
        const local = localStorage.getItem("currentWorkspaceId");
        const found = action.payload.find((w) => w.id === local);
        state.currentWorkspace = found || action.payload[0];
      }
      state.loading = false;
    });
    builder.addCase(fetchWorkspaces.rejected, (state) => {
      state.loading = false;
    });
  },
});

export const {
  setWorkspaces,
  setCurrentWorkspace,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addProject,
  addTask,
  updateTask,
  deleteTask,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
