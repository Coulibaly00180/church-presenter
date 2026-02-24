import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

interface PlanContextValue {
  planList: CpPlanListItem[];
  plan: CpPlan | null;
  selectedPlanId: string | null;
  loadingList: boolean;
  loadingPlan: boolean;
  selectPlan: (id: string | null) => void;
  refreshList: () => Promise<void>;
  refreshPlan: () => Promise<void>;
  addItem: (payload: Omit<CpPlanAddItemPayload, "planId">) => Promise<CpPlanItem | null>;
  removeItem: (itemId: string) => Promise<void>;
  reorder: (orderedItemIds: string[]) => Promise<void>;
  createPlan: (payload: CpPlanCreatePayload) => Promise<CpPlan | null>;
  updatePlan: (title: string) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [planList, setPlanList] = useState<CpPlanListItem[]>([]);
  const [plan, setPlan] = useState<CpPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await window.cp.plans.list();
      setPlanList(list);
      // Auto-select most recent plan if none selected
      if (!selectedPlanId && list.length > 0) {
        setSelectedPlanId(list[0].id);
      }
    } finally {
      setLoadingList(false);
    }
  }, [selectedPlanId]);

  const refreshPlan = useCallback(async () => {
    if (!selectedPlanId) {
      setPlan(null);
      return;
    }
    setLoadingPlan(true);
    try {
      const loaded = await window.cp.plans.get(selectedPlanId);
      setPlan(loaded);
    } finally {
      setLoadingPlan(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    void refreshList();
  }, []);

  useEffect(() => {
    void refreshPlan();
  }, [selectedPlanId]);

  const selectPlan = useCallback((id: string | null) => {
    setSelectedPlanId(id);
  }, []);

  const addItem = useCallback(async (payload: Omit<CpPlanAddItemPayload, "planId">) => {
    if (!selectedPlanId) return null;
    try {
      const item = await window.cp.plans.addItem({ planId: selectedPlanId, ...payload });
      await refreshPlan();
      return item;
    } catch {
      toast.error("Impossible d'ajouter l'élément");
      return null;
    }
  }, [selectedPlanId, refreshPlan]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!selectedPlanId) return;
    try {
      await window.cp.plans.removeItem({ planId: selectedPlanId, itemId });
      await refreshPlan();
    } catch {
      toast.error("Impossible de supprimer l'élément");
    }
  }, [selectedPlanId, refreshPlan]);

  const reorder = useCallback(async (orderedItemIds: string[]) => {
    if (!selectedPlanId) return;
    // Optimistic update
    setPlan((prev) => {
      if (!prev) return prev;
      const idxMap = new Map(orderedItemIds.map((id, i) => [id, i]));
      return {
        ...prev,
        items: [...prev.items].sort((a, b) => (idxMap.get(a.id) ?? 0) - (idxMap.get(b.id) ?? 0)),
      };
    });
    try {
      await window.cp.plans.reorder({ planId: selectedPlanId, orderedItemIds });
    } catch {
      toast.error("Impossible de réorganiser le plan");
      await refreshPlan();
    }
  }, [selectedPlanId, refreshPlan]);

  const createPlan = useCallback(async (payload: CpPlanCreatePayload) => {
    try {
      const newPlan = await window.cp.plans.create(payload);
      await refreshList();
      setSelectedPlanId(newPlan.id);
      return newPlan;
    } catch {
      toast.error("Impossible de créer le plan");
      return null;
    }
  }, [refreshList]);

  const updatePlan = useCallback(async (title: string) => {
    if (!selectedPlanId) return;
    try {
      await window.cp.plans.update({ planId: selectedPlanId, title });
      setPlan((prev) => prev ? { ...prev, title } : prev);
      await refreshList();
    } catch {
      toast.error("Impossible de renommer le plan");
    }
  }, [selectedPlanId, refreshList]);

  const deletePlan = useCallback(async (planId: string) => {
    try {
      await window.cp.plans.delete(planId);
      if (selectedPlanId === planId) setSelectedPlanId(null);
      await refreshList();
    } catch {
      toast.error("Impossible de supprimer le plan");
    }
  }, [selectedPlanId, refreshList]);

  const value: PlanContextValue = {
    planList,
    plan,
    selectedPlanId,
    loadingList,
    loadingPlan,
    selectPlan,
    refreshList,
    refreshPlan,
    addItem,
    removeItem,
    reorder,
    createPlan,
    updatePlan,
    deletePlan,
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlanContext must be used within PlanProvider");
  return ctx;
}
