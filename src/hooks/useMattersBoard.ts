import { useEffect, useMemo, useState } from "react";
import {
  archiveMatter,
  createMatter,
  deleteMatter,
  listMatterNotes,
  listMatters,
  moveMatterStage,
  saveMatter,
  saveMatterNote
} from "@/services/matters";
import type { Matter, MatterFormInput, MatterNote, MatterStage } from "@/types/matter";

type UseMattersBoardResult = {
  matters: Matter[];
  filteredMatters: Matter[];
  selectedMatter: Matter | null;
  selectedMatterNotes: MatterNote[];
  searchTerm: string;
  isCreateMode: boolean;
  isLoading: boolean;
  error: string | null;
  setSearchTerm: (value: string) => void;
  selectMatter: (matterId: string | null) => void;
  openCreateMatter: () => void;
  closeCreateMatter: () => void;
  createMatter: (input: MatterFormInput) => Promise<void>;
  updateMatter: (matterId: string, input: MatterFormInput) => Promise<void>;
  moveMatter: (matterId: string, stage: MatterStage) => Promise<void>;
  addNote: (matterId: string, body: string) => Promise<void>;
  deleteMatter: (matterId: string) => Promise<void>;
  archiveMatter: (matterId: string) => Promise<void>;
};

export function useMattersBoard(): UseMattersBoardResult {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [selectedMatterNotes, setSelectedMatterNotes] = useState<MatterNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function hydrateBoard() {
    try {
      setIsLoading(true);
      const items = await listMatters();
      const activeMatters = items.filter((matter) => !matter.archived);
      setMatters(activeMatters);
      setSelectedMatterId((current) => current ?? activeMatters[0]?.id ?? null);
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
    await moveMatterStage(matterId, stage);
    await hydrateBoard();
    setSelectedMatterId(matterId);
  }

  async function handleAddNote(matterId: string, body: string) {
    await saveMatterNote(matterId, body);
    await Promise.all([hydrateBoard(), hydrateNotes(matterId)]);
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

  return {
    matters,
    filteredMatters,
    selectedMatter,
    selectedMatterNotes,
    searchTerm,
    isCreateMode,
    isLoading,
    error,
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
    createMatter: handleCreateMatter,
    updateMatter: handleUpdateMatter,
    moveMatter: handleMoveMatter,
    addNote: handleAddNote,
    deleteMatter: handleDeleteMatter,
    archiveMatter: handleArchiveMatter
  };
}

