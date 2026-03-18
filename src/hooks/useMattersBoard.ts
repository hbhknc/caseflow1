import { useEffect, useMemo, useState } from "react";
import {
  archiveMatter,
  createMatter,
  deleteMatter,
  listArchivedMatters,
  listMatterNotes,
  listMatters,
  listTasks,
  moveMatterStage,
  saveMatter,
  saveMatterNote,
  unarchiveMatter
} from "@/services/matters";
import { getMatterStats } from "@/services/stats";
import type { MatterStats } from "@/types/api";
import { STAGES } from "@/utils/stages";
import type {
  Matter,
  MatterFormInput,
  MatterNote,
  MatterStage,
  MatterTask
} from "@/types/matter";

type UseMattersBoardResult = {
  matters: Matter[];
  filteredMatters: Matter[];
  selectedMatter: Matter | null;
  selectedMatterNotes: MatterNote[];
  archivedMatters: Matter[];
  tasks: MatterTask[];
  stats: MatterStats | null;
  searchTerm: string;
  isCreateMode: boolean;
  isArchiveOpen: boolean;
  isTaskListOpen: boolean;
  isStatsOpen: boolean;
  isLoading: boolean;
  error: string | null;
  archiveError: string | null;
  statsError: string | null;
  setSearchTerm: (value: string) => void;
  selectMatter: (matterId: string | null) => void;
  openCreateMatter: () => void;
  closeCreateMatter: () => void;
  openArchive: () => Promise<void>;
  closeArchive: () => void;
  openTaskList: () => Promise<void>;
  closeTaskList: () => void;
  openStats: () => Promise<void>;
  closeStats: () => void;
  createMatter: (input: MatterFormInput) => Promise<void>;
  updateMatter: (matterId: string, input: MatterFormInput) => Promise<void>;
  moveMatter: (matterId: string, stage: MatterStage) => Promise<void>;
  addNote: (matterId: string, body: string, addToTaskList: boolean) => Promise<void>;
  deleteMatter: (matterId: string) => Promise<void>;
  archiveMatter: (matterId: string) => Promise<void>;
  unarchiveMatter: (matterId: string) => Promise<void>;
};

export function useMattersBoard(): UseMattersBoardResult {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [selectedMatterNotes, setSelectedMatterNotes] = useState<MatterNote[]>([]);
  const [archivedMatters, setArchivedMatters] = useState<Matter[]>([]);
  const [tasks, setTasks] = useState<MatterTask[]>([]);
  const [stats, setStats] = useState<MatterStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    void hydrateBoard();
  }, []);

  useEffect(() => {
    if (!selectedMatterId) {
      setSelectedMatterNotes([]);
      return;
    }

    void hydrateNotes(selectedMatterId);
  }, [selectedMatterId]);

  const filteredMatters = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    if (!needle) {
      return matters;
    }

    return matters.filter((matter) =>
      [matter.decedentName, matter.clientName, matter.fileNumber].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }, [matters, searchTerm]);

  const selectedMatter = useMemo(
    () => matters.find((matter) => matter.id === selectedMatterId) ?? null,
    [matters, selectedMatterId]
  );

  function sortMatters(items: Matter[]) {
    return [...items].sort((left, right) => {
      const stageDelta = STAGES.indexOf(left.stage) - STAGES.indexOf(right.stage);

      if (stageDelta !== 0) {
        return stageDelta;
      }

      return right.lastActivityAt.localeCompare(left.lastActivityAt);
    });
  }

  async function hydrateBoard() {
    try {
      setIsLoading(true);
      const items = await listMatters();
      const activeMatters = items.filter((matter) => !matter.archived);
      setMatters(activeMatters);
      setSelectedMatterId((current) =>
        current && activeMatters.some((matter) => matter.id === current) ? current : null
      );
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load matters."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function hydrateNotes(matterId: string) {
    try {
      const items = await listMatterNotes(matterId);
      setSelectedMatterNotes(items);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load notes."
      );
    }
  }

  async function hydrateTasks() {
    try {
      const items = await listTasks();
      setTasks(items);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load tasks."
      );
    }
  }

  async function hydrateArchive() {
    try {
      const items = await listArchivedMatters();
      setArchivedMatters(items);
      setArchiveError(null);
    } catch (caughtError) {
      setArchiveError(
        caughtError instanceof Error ? caughtError.message : "Unable to load archive."
      );
    }
  }

  async function hydrateStats() {
    try {
      const items = await getMatterStats();
      setStats(items);
      setStatsError(null);
    } catch (caughtError) {
      setStatsError(
        caughtError instanceof Error ? caughtError.message : "Unable to load stats."
      );
    }
  }

  async function handleCreateMatter(input: MatterFormInput) {
    await createMatter(input);
    setIsCreateMode(false);
    await hydrateBoard();
  }

  async function handleUpdateMatter(matterId: string, input: MatterFormInput) {
    await saveMatter(matterId, input);
    await hydrateBoard();
    setSelectedMatterId(matterId);
  }

  async function handleMoveMatter(matterId: string, stage: MatterStage) {
    const previousMatters = matters;
    const optimisticTimestamp = new Date().toISOString();

    setMatters((current) =>
      sortMatters(
        current.map((matter) =>
          matter.id === matterId
            ? {
                ...matter,
                stage,
                lastActivityAt: optimisticTimestamp
              }
            : matter
        )
      )
    );

    try {
      const updatedMatter = await moveMatterStage(matterId, stage);
      setMatters((current) =>
        sortMatters(
          current.map((matter) => (matter.id === matterId ? updatedMatter : matter))
        )
      );
    } catch (caughtError) {
      setMatters(previousMatters);
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to move matter."
      );
    }
  }

  async function handleAddNote(matterId: string, body: string, addToTaskList: boolean) {
    await saveMatterNote(matterId, body, addToTaskList);
    await Promise.all([hydrateBoard(), hydrateNotes(matterId), hydrateTasks()]);
    setSelectedMatterId(matterId);
  }

  async function handleDeleteMatter(matterId: string) {
    await deleteMatter(matterId);
    setSelectedMatterId(null);
    setSelectedMatterNotes([]);
    await hydrateBoard();
  }

  async function handleArchiveMatter(matterId: string) {
    await archiveMatter(matterId);
    setSelectedMatterId(null);
    setSelectedMatterNotes([]);
    await hydrateBoard();
  }

  async function handleUnarchiveMatter(matterId: string) {
    await unarchiveMatter(matterId);
    await Promise.all([hydrateBoard(), hydrateArchive(), hydrateStats()]);
  }

  return {
    matters,
    filteredMatters,
    selectedMatter,
    selectedMatterNotes,
    archivedMatters,
    tasks,
    stats,
    searchTerm,
    isCreateMode,
    isArchiveOpen,
    isTaskListOpen,
    isStatsOpen,
    isLoading,
    error,
    archiveError,
    statsError,
    setSearchTerm,
    selectMatter: (matterId) => {
      setIsCreateMode(false);
      setSelectedMatterId(matterId);
    },
    openCreateMatter: () => {
      setIsCreateMode(true);
      setSelectedMatterId(null);
      setSelectedMatterNotes([]);
    },
    closeCreateMatter: () => setIsCreateMode(false),
    openArchive: async () => {
      await hydrateArchive();
      setIsArchiveOpen(true);
    },
    closeArchive: () => setIsArchiveOpen(false),
    openTaskList: async () => {
      await hydrateTasks();
      setIsTaskListOpen(true);
    },
    closeTaskList: () => setIsTaskListOpen(false),
    openStats: async () => {
      await hydrateStats();
      setIsStatsOpen(true);
    },
    closeStats: () => setIsStatsOpen(false),
    createMatter: handleCreateMatter,
    updateMatter: handleUpdateMatter,
    moveMatter: handleMoveMatter,
    addNote: handleAddNote,
    deleteMatter: handleDeleteMatter,
    archiveMatter: handleArchiveMatter,
    unarchiveMatter: handleUnarchiveMatter
  };
}
