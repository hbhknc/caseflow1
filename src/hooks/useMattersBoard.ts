import { useEffect, useMemo, useState } from "react";
import {
  archiveMatter,
  completeTask as completeTaskApi,
  createMatter,
  deleteMatter,
  importMatters as importMattersApi,
  listArchivedMatters,
  listMatterNotes,
  listMatters,
  listTasks,
  moveMatterStage,
  saveMatter,
  saveMatterNote,
  unarchiveMatter
} from "@/services/matters";
import {
  completeDeadline as completeDeadlineApi,
  createDeadline as createDeadlineApi,
  dismissDeadline as dismissDeadlineApi,
  listDeadlineDashboard,
  listMatterDeadlines,
  saveMatterDeadlineSettings as saveMatterDeadlineSettingsApi,
  updateDeadline as updateDeadlineApi
} from "@/services/deadlines";
import { getMatterStats } from "@/services/stats";
import type { MatterImportRowInput, MatterImportSummary, MatterStats } from "@/types/api";
import type {
  Deadline,
  MatterAnchorAlert,
  DeadlineDashboardData,
  DeadlineDashboardFilters,
  DeadlineInput,
  DeadlineUpdateInput,
  MatterDeadlineSettings,
  MatterDeadlineSettingsInput
} from "@/types/deadlines";
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
  selectedMatterDeadlines: Deadline[];
  selectedMatterDeadlineSettings: MatterDeadlineSettings | null;
  selectedMatterDeadlineAnchorIssues: MatterAnchorAlert[];
  archivedMatters: Matter[];
  filteredArchivedMatters: Matter[];
  tasks: MatterTask[];
  stats: MatterStats | null;
  deadlineDashboard: DeadlineDashboardData | null;
  deadlineDashboardFilters: DeadlineDashboardFilters;
  searchTerm: string;
  isCreateMode: boolean;
  isArchiveOpen: boolean;
  isTaskListOpen: boolean;
  isStatsOpen: boolean;
  isDeadlinesOpen: boolean;
  isLoading: boolean;
  error: string | null;
  archiveError: string | null;
  statsError: string | null;
  deadlineError: string | null;
  deadlineDashboardError: string | null;
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
  openDeadlines: () => Promise<void>;
  closeDeadlines: () => void;
  setDeadlineDashboardFilters: (filters: DeadlineDashboardFilters) => Promise<void>;
  createMatter: (input: MatterFormInput) => Promise<void>;
  updateMatter: (matterId: string, input: MatterFormInput) => Promise<Matter>;
  moveMatter: (
    matterId: string,
    stage: MatterStage,
    beforeMatterId?: string | null
  ) => Promise<void>;
  addNote: (matterId: string, body: string, addToTaskList: boolean) => Promise<void>;
  quickAddNote: (matterId: string, body: string, addToTaskList: boolean) => Promise<void>;
  deleteMatter: (matterId: string) => Promise<void>;
  archiveMatter: (matterId: string) => Promise<void>;
  unarchiveMatter: (matterId: string) => Promise<void>;
  importMatters: (rows: MatterImportRowInput[]) => Promise<MatterImportSummary>;
  completeTask: (taskId: string) => Promise<void>;
  saveMatterDeadlineSettings: (
    matterId: string,
    input: MatterDeadlineSettingsInput
  ) => Promise<void>;
  createDeadline: (input: DeadlineInput) => Promise<void>;
  updateDeadline: (deadlineId: string, input: DeadlineUpdateInput) => Promise<void>;
  completeDeadline: (deadlineId: string, completionNote: string) => Promise<void>;
  dismissDeadline: (deadlineId: string) => Promise<void>;
};

const DEFAULT_DEADLINE_DASHBOARD_FILTERS: DeadlineDashboardFilters = {
  assignee: "",
  matterId: "",
  status: "all"
};

export function useMattersBoard(boardId: string): UseMattersBoardResult {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [selectedMatterNotes, setSelectedMatterNotes] = useState<MatterNote[]>([]);
  const [selectedMatterDeadlines, setSelectedMatterDeadlines] = useState<Deadline[]>([]);
  const [selectedMatterDeadlineSettings, setSelectedMatterDeadlineSettings] =
    useState<MatterDeadlineSettings | null>(null);
  const [selectedMatterDeadlineAnchorIssues, setSelectedMatterDeadlineAnchorIssues] = useState<
    MatterAnchorAlert[]
  >([]);
  const [archivedMatters, setArchivedMatters] = useState<Matter[]>([]);
  const [tasks, setTasks] = useState<MatterTask[]>([]);
  const [stats, setStats] = useState<MatterStats | null>(null);
  const [deadlineDashboard, setDeadlineDashboard] = useState<DeadlineDashboardData | null>(null);
  const [deadlineDashboardFilters, setDeadlineDashboardFiltersState] =
    useState<DeadlineDashboardFilters>(DEFAULT_DEADLINE_DASHBOARD_FILTERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isTaskListOpen, setIsTaskListOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isDeadlinesOpen, setIsDeadlinesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [deadlineDashboardError, setDeadlineDashboardError] = useState<string | null>(null);

  useEffect(() => {
    void hydrateBoard();
  }, [boardId]);

  useEffect(() => {
    if (!selectedMatterId) {
      setSelectedMatterNotes([]);
      return;
    }

    void hydrateNotes(selectedMatterId);
  }, [selectedMatterId]);

  useEffect(() => {
    if (!selectedMatterId) {
      setSelectedMatterDeadlines([]);
      setSelectedMatterDeadlineSettings(null);
      setSelectedMatterDeadlineAnchorIssues([]);
      setDeadlineError(null);
      return;
    }

    void hydrateMatterDeadlines(selectedMatterId);
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

  const filteredArchivedMatters = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    if (!needle) {
      return archivedMatters;
    }

    return archivedMatters.filter((matter) =>
      [matter.decedentName, matter.clientName, matter.fileNumber].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }, [archivedMatters, searchTerm]);

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

      return left.sortOrder - right.sortOrder;
    });
  }

  function sortArchived(items: Matter[]) {
    return [...items].sort((left, right) =>
      (right.archivedAt ?? "").localeCompare(left.archivedAt ?? "")
    );
  }

  function reorderMatters(
    items: Matter[],
    matterId: string,
    nextStage: MatterStage,
    beforeMatterId: string | null,
    optimisticTimestamp: string
  ) {
    const movingMatter = items.find((matter) => matter.id === matterId);

    if (!movingMatter) {
      return items;
    }

    const sourceStage = movingMatter.stage;
    const destinationItems = items
      .filter(
        (matter) => matter.stage === nextStage && matter.id !== matterId && !matter.archived
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const sourceItems = items
      .filter(
        (matter) => matter.stage === sourceStage && matter.id !== matterId && !matter.archived
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const destinationInsertIndex = beforeMatterId
      ? destinationItems.findIndex((matter) => matter.id === beforeMatterId)
      : destinationItems.length;
    const updatedMovingMatter: Matter = {
      ...movingMatter,
      stage: nextStage,
      lastActivityAt:
        sourceStage !== nextStage ? optimisticTimestamp : movingMatter.lastActivityAt
    };
    const nextDestinationItems = [...destinationItems];
    nextDestinationItems.splice(
      destinationInsertIndex >= 0 ? destinationInsertIndex : destinationItems.length,
      0,
      updatedMovingMatter
    );

    const sourceStageUpdates =
      sourceStage === nextStage
        ? []
        : sourceItems.map((matter, index) => ({ ...matter, sortOrder: index + 1 }));
    const destinationStageUpdates = nextDestinationItems.map((matter, index) => ({
      ...matter,
      sortOrder: index + 1
    }));
    const stagedUpdates = new Map(
      [...sourceStageUpdates, ...destinationStageUpdates].map((matter) => [matter.id, matter])
    );

    return sortMatters(items.map((matter) => stagedUpdates.get(matter.id) ?? matter));
  }

  function applyMatterUpdate(updatedMatter: Matter) {
    setMatters((current) => {
      const remaining = current.filter((matter) => matter.id !== updatedMatter.id);
      return updatedMatter.archived ? sortMatters(remaining) : sortMatters([...remaining, updatedMatter]);
    });
    setArchivedMatters((current) => {
      const remaining = current.filter((matter) => matter.id !== updatedMatter.id);
      return updatedMatter.archived ? sortArchived([...remaining, updatedMatter]) : sortArchived(remaining);
    });
  }

  async function hydrateBoard() {
    try {
      setIsLoading(true);
      const [items, archivedItems] = await Promise.all([
        listMatters(boardId),
        listArchivedMatters(boardId)
      ]);
      const activeMatters = items.filter((matter) => !matter.archived);
      setMatters(sortMatters(activeMatters));
      setArchivedMatters(sortArchived(archivedItems));
      setSelectedMatterId((current) =>
        current && activeMatters.some((matter) => matter.id === current) ? current : null
      );
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load matters.");
    } finally {
      setIsLoading(false);
    }
  }

  async function hydrateNotes(matterId: string) {
    try {
      const items = await listMatterNotes(matterId);
      setSelectedMatterNotes(items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load notes.");
    }
  }

  async function hydrateMatterDeadlines(matterId: string) {
    try {
      const response = await listMatterDeadlines(matterId);
      applyMatterUpdate(response.matter);
      setSelectedMatterDeadlines(response.deadlines);
      setSelectedMatterDeadlineSettings(response.settings);
      setSelectedMatterDeadlineAnchorIssues(response.anchorIssues);
      setDeadlineError(null);
    } catch (caughtError) {
      setSelectedMatterDeadlines([]);
      setSelectedMatterDeadlineSettings(null);
      setSelectedMatterDeadlineAnchorIssues([]);
      setDeadlineError(
        caughtError instanceof Error ? caughtError.message : "Unable to load deadlines."
      );
    }
  }

  async function hydrateTasks() {
    try {
      const items = await listTasks(boardId);
      setTasks(items);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load tasks.");
    }
  }

  async function hydrateArchive() {
    try {
      const items = await listArchivedMatters(boardId);
      setArchivedMatters(sortArchived(items));
      setArchiveError(null);
    } catch (caughtError) {
      setArchiveError(
        caughtError instanceof Error ? caughtError.message : "Unable to load archive."
      );
    }
  }

  async function hydrateStats() {
    try {
      const items = await getMatterStats(boardId);
      setStats(items);
      setStatsError(null);
    } catch (caughtError) {
      setStatsError(
        caughtError instanceof Error ? caughtError.message : "Unable to load stats."
      );
    }
  }

  async function hydrateDeadlineDashboard(filters = deadlineDashboardFilters) {
    try {
      const data = await listDeadlineDashboard(filters);
      setDeadlineDashboard(data);
      setDeadlineDashboardError(null);
    } catch (caughtError) {
      setDeadlineDashboard(null);
      setDeadlineDashboardError(
        caughtError instanceof Error ? caughtError.message : "Unable to load deadlines."
      );
    }
  }

  async function handleCreateMatter(input: MatterFormInput) {
    await createMatter(input);
    setIsCreateMode(false);
    await hydrateBoard();
  }

  async function handleUpdateMatter(matterId: string, input: MatterFormInput) {
    const savedMatter = await saveMatter(matterId, input);

    applyMatterUpdate(savedMatter);
    setSelectedMatterId(savedMatter.id);
    setError(null);

    return savedMatter;
  }

  async function handleMoveMatter(
    matterId: string,
    stage: MatterStage,
    beforeMatterId: string | null = null
  ) {
    const previousMatters = matters;
    const optimisticTimestamp = new Date().toISOString();

    setMatters((current) =>
      reorderMatters(current, matterId, stage, beforeMatterId, optimisticTimestamp)
    );

    try {
      await moveMatterStage(matterId, stage, beforeMatterId);
      await hydrateBoard();
    } catch (caughtError) {
      setMatters(previousMatters);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to move matter.");
    }
  }

  async function handleAddNote(matterId: string, body: string, addToTaskList: boolean) {
    await saveMatterNote(matterId, body, addToTaskList);
    await Promise.all([hydrateBoard(), hydrateNotes(matterId), hydrateTasks()]);
    setSelectedMatterId(matterId);
  }

  async function handleQuickAddNote(
    matterId: string,
    body: string,
    addToTaskList: boolean
  ) {
    await saveMatterNote(matterId, body, addToTaskList);
    await Promise.all([hydrateBoard(), hydrateTasks()]);
  }

  async function handleDeleteMatter(matterId: string) {
    await deleteMatter(matterId);
    setSelectedMatterId(null);
    setSelectedMatterNotes([]);
    setSelectedMatterDeadlines([]);
    setSelectedMatterDeadlineSettings(null);
    setSelectedMatterDeadlineAnchorIssues([]);
    await Promise.all([hydrateBoard(), isDeadlinesOpen ? hydrateDeadlineDashboard() : Promise.resolve()]);
  }

  async function handleArchiveMatter(matterId: string) {
    await archiveMatter(matterId);
    setSelectedMatterId(null);
    setSelectedMatterNotes([]);
    setSelectedMatterDeadlines([]);
    setSelectedMatterDeadlineSettings(null);
    setSelectedMatterDeadlineAnchorIssues([]);
    await Promise.all([
      hydrateBoard(),
      hydrateStats(),
      isDeadlinesOpen ? hydrateDeadlineDashboard() : Promise.resolve()
    ]);
  }

  async function handleUnarchiveMatter(matterId: string) {
    await unarchiveMatter(matterId);
    await Promise.all([
      hydrateBoard(),
      hydrateArchive(),
      hydrateStats(),
      isDeadlinesOpen ? hydrateDeadlineDashboard() : Promise.resolve()
    ]);
  }

  async function handleImportMatters(rows: MatterImportRowInput[]) {
    const summary = await importMattersApi(boardId, rows);
    await Promise.all([hydrateBoard(), hydrateArchive(), hydrateStats()]);
    return summary;
  }

  async function handleCompleteTask(taskId: string) {
    await completeTaskApi(taskId);
    await hydrateTasks();
  }

  async function handleSetDeadlineDashboardFilters(filters: DeadlineDashboardFilters) {
    setDeadlineDashboardFiltersState(filters);
    await hydrateDeadlineDashboard(filters);
  }

  async function handleSaveMatterDeadlineSettings(
    matterId: string,
    input: MatterDeadlineSettingsInput
  ) {
    try {
      const response = await saveMatterDeadlineSettingsApi(matterId, input);
      applyMatterUpdate(response.matter);
      setSelectedMatterId(response.matter.id);
      setSelectedMatterDeadlineSettings(response.settings);
      setSelectedMatterDeadlines(response.deadlines);
      setSelectedMatterDeadlineAnchorIssues(response.anchorIssues);
      setDeadlineError(null);

      if (isDeadlinesOpen) {
        await hydrateDeadlineDashboard();
      }
    } catch (caughtError) {
      setDeadlineError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save deadline settings."
      );
      throw caughtError;
    }
  }

  async function handleCreateDeadline(input: DeadlineInput) {
    const response = await createDeadlineApi(input);
    applyMatterUpdate(response.matter);
    setSelectedMatterId(response.matter.id);

    if (selectedMatterId === response.matter.id) {
      await hydrateMatterDeadlines(response.matter.id);
    }

    if (isDeadlinesOpen) {
      await hydrateDeadlineDashboard();
    }
  }

  async function handleUpdateDeadline(deadlineId: string, input: DeadlineUpdateInput) {
    const response = await updateDeadlineApi(deadlineId, input);
    applyMatterUpdate(response.matter);

    if (selectedMatterId === response.matter.id) {
      await hydrateMatterDeadlines(response.matter.id);
    }

    if (isDeadlinesOpen) {
      await hydrateDeadlineDashboard();
    }
  }

  async function handleCompleteDeadline(deadlineId: string, completionNote: string) {
    const response = await completeDeadlineApi(deadlineId, { completionNote });
    applyMatterUpdate(response.matter);

    if (selectedMatterId === response.matter.id) {
      await hydrateMatterDeadlines(response.matter.id);
    }

    if (isDeadlinesOpen) {
      await hydrateDeadlineDashboard();
    }
  }

  async function handleDismissDeadline(deadlineId: string) {
    const response = await dismissDeadlineApi(deadlineId);
    applyMatterUpdate(response.matter);

    if (selectedMatterId === response.matter.id) {
      await hydrateMatterDeadlines(response.matter.id);
    }

    if (isDeadlinesOpen) {
      await hydrateDeadlineDashboard();
    }
  }

  return {
    matters,
    filteredMatters,
    selectedMatter,
    selectedMatterNotes,
    selectedMatterDeadlines,
    selectedMatterDeadlineSettings,
    selectedMatterDeadlineAnchorIssues,
    archivedMatters,
    filteredArchivedMatters,
    tasks,
    stats,
    deadlineDashboard,
    deadlineDashboardFilters,
    searchTerm,
    isCreateMode,
    isArchiveOpen,
    isTaskListOpen,
    isStatsOpen,
    isDeadlinesOpen,
    isLoading,
    error,
    archiveError,
    statsError,
    deadlineError,
    deadlineDashboardError,
    setSearchTerm,
    selectMatter: (matterId) => {
      setIsCreateMode(false);
      setSelectedMatterId(matterId);
    },
    openCreateMatter: () => {
      setIsCreateMode(true);
      setSelectedMatterId(null);
      setSelectedMatterNotes([]);
      setSelectedMatterDeadlines([]);
      setSelectedMatterDeadlineSettings(null);
      setSelectedMatterDeadlineAnchorIssues([]);
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
    openDeadlines: async () => {
      await hydrateDeadlineDashboard();
      setIsDeadlinesOpen(true);
    },
    closeDeadlines: () => setIsDeadlinesOpen(false),
    setDeadlineDashboardFilters: handleSetDeadlineDashboardFilters,
    createMatter: handleCreateMatter,
    updateMatter: handleUpdateMatter,
    moveMatter: handleMoveMatter,
    addNote: handleAddNote,
    quickAddNote: handleQuickAddNote,
    deleteMatter: handleDeleteMatter,
    archiveMatter: handleArchiveMatter,
    unarchiveMatter: handleUnarchiveMatter,
    importMatters: handleImportMatters,
    completeTask: handleCompleteTask,
    saveMatterDeadlineSettings: handleSaveMatterDeadlineSettings,
    createDeadline: handleCreateDeadline,
    updateDeadline: handleUpdateDeadline,
    completeDeadline: handleCompleteDeadline,
    dismissDeadline: handleDismissDeadline
  };
}
