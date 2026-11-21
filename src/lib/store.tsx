import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EQUIPMENT, LOTS, RAW_MATERIALS, SEED_BATCHES, SEED_INVESTIGATIONS, SEED_SPECS, SUPPLIERS } from "@/data/seed";
import type { Batch, Equipment, IngredientLot, Investigation, Prediction, RawMaterial, Specification, Supplier } from "@/data/types";
import { predictBatch } from "@/services/prediction/simulatedModel";

const STORAGE_KEY = "bq.data.v5";

interface PersistedState {
  batches: Batch[];
  investigations: Investigation[];
  specs: Specification[];
  lots: IngredientLot[];
}

interface Store extends PersistedState {
  suppliers: Supplier[];
  materials: RawMaterial[];
  equipment: Equipment[];
  predictions: Record<string, Prediction[]>;
  addBatch: (b: Batch) => void;
  updateBatch: (id: string, patch: Partial<Batch>) => void;
  addInvestigation: (i: Investigation) => void;
  updateInvestigation: (id: string, patch: Partial<Investigation> | ((i: Investigation) => Partial<Investigation>)) => void;
  updateSpec: (s: Specification) => void;
  resetDemo: () => void;
  specFor: (family: string) => Specification;
}

const StoreContext = createContext<Store | null>(null);

const seedState = (): PersistedState => structuredClone({ batches: SEED_BATCHES, investigations: SEED_INVESTIGATIONS, specs: SEED_SPECS, lots: LOTS });

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {
    /* ignore */
  }
  return seedState();
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable */
    }
  }, [state]);

  const specFor = useCallback((family: string) => state.specs.find((s) => s.productFamily === family) ?? state.specs[0], [state.specs]);

  // Predictions are derived (simulated SageMaker surrogate) — never stored into lab fields.
  const predictions = useMemo(() => {
    const out: Record<string, Prediction[]> = {};
    for (const b of state.batches) out[b.id] = predictBatch(b, specFor(b.productFamily), state.lots);
    return out;
  }, [state.batches, state.lots, specFor]);

  const value: Store = {
    ...state,
    suppliers: SUPPLIERS,
    materials: RAW_MATERIALS,
    equipment: EQUIPMENT,
    predictions,
    specFor,
    addBatch: (b) => setState((s) => ({ ...s, batches: [...s.batches, b] })),
    updateBatch: (id, patch) => setState((s) => ({ ...s, batches: s.batches.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
    addInvestigation: (i) => setState((s) => ({ ...s, investigations: [i, ...s.investigations] })),
    updateInvestigation: (id, patch) =>
      setState((s) => ({
        ...s,
        investigations: s.investigations.map((i) => (i.id === id ? { ...i, ...(typeof patch === "function" ? patch(i) : patch) } : i)),
      })),
    updateSpec: (spec) => setState((s) => ({ ...s, specs: s.specs.map((x) => (x.productFamily === spec.productFamily ? spec : x)) })),
    resetDemo: () => setState(seedState()),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
