import { create } from 'zustand';

type ParticipantId = string;

interface RoundReadinessState {
  readinessByRound: Record<number, Set<ParticipantId>>;
  localReadyByRound: Record<number, boolean>;
  setLocalReady: (round: number, ready: boolean) => void;
  resetRound: (round: number) => void;
  resetAll: () => void;
}

const cloneReadinessMap = (input: Record<number, Set<ParticipantId>>): Record<number, Set<ParticipantId>> => {
  const next: Record<number, Set<ParticipantId>> = {};
  Object.entries(input).forEach(([key, value]) => {
    next[Number(key)] = new Set(value);
  });
  return next;
};

export const useResultsReadinessStore = create<RoundReadinessState>((set) => ({
  readinessByRound: {},
  localReadyByRound: {},
  setLocalReady: (round, ready) => set((state) => ({
    localReadyByRound: { ...state.localReadyByRound, [round]: ready },
  })),
  resetRound: (round) => set((state) => {
    const readinessMap = cloneReadinessMap(state.readinessByRound);
    delete readinessMap[round];
    const localReady = { ...state.localReadyByRound };
    delete localReady[round];
    return {
      readinessByRound: readinessMap,
      localReadyByRound: localReady,
    };
  }),
  resetAll: () => set({ readinessByRound: {}, localReadyByRound: {} }),
}));

export const updateRoundReadiness = (round: number, participantIds: ParticipantId[], ready: boolean) => {
  useResultsReadinessStore.setState((state) => {
    const readinessMap = cloneReadinessMap(state.readinessByRound);
    const key = Number(round);
    const existing = readinessMap[key] ?? new Set<ParticipantId>();
    if (!ready) {
      participantIds.forEach((id) => existing.delete(id));
    } else {
      participantIds.forEach((id) => existing.add(id));
    }
    readinessMap[key] = existing;
    return { readinessByRound: readinessMap };
  });
};

export const setRoundReadinessSnapshot = (round: number, readyIds: ParticipantId[]) => {
  useResultsReadinessStore.setState((state) => {
    const readinessMap = cloneReadinessMap(state.readinessByRound);
    readinessMap[round] = new Set(readyIds);
    return { readinessByRound: readinessMap };
  });
};

export const getRoundReadyCount = (round: number): number => {
  const state = useResultsReadinessStore.getState();
  const setRef = state.readinessByRound[round];
  return setRef ? setRef.size : 0;
};

export const getRoundLocalReady = (round: number): boolean => {
  const state = useResultsReadinessStore.getState();
  return state.localReadyByRound[round] ?? false;
};
