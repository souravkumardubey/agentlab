import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceState {
  workspaceId: string | null;
  workspaceName: string | null;
  setWorkspace: (id: string, name: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaceId: null,
      workspaceName: null,
      setWorkspace: (id, name) => set({ workspaceId: id, workspaceName: name }),
    }),
    { name: 'agentlab-workspace' }
  )
);
