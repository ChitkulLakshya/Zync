import { describe, expect, test } from "vitest";
import { reducer, TOAST_LIMIT } from "./use-toast";
import type { Action, State, ToasterToast } from "./use-toast";

describe("use-toast reducer", () => {
  const initialState: State = { toasts: [] };

  test("ADD_TOAST should add a toast to empty state", () => {

    const toast: ToasterToast = { id: "1", title: "Test Toast", open: true } as unknown as ToasterToast;
    const action: Action = { type: "ADD_TOAST", toast };
    const newState = reducer(initialState, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0]).toEqual(toast);
  });

  test(`ADD_TOAST should respect TOAST_LIMIT (${TOAST_LIMIT}) and replace existing toast`, () => {
    const existingToast: ToasterToast = { id: "1", title: "Existing", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [existingToast] };
    const newToast: ToasterToast = { id: "2", title: "New", open: true } as unknown as ToasterToast;
    const action: Action = { type: "ADD_TOAST", toast: newToast };
    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(TOAST_LIMIT);


    expect(newState.toasts[0]).toEqual(newToast);
    expect(newState.toasts[0].id).toBe("2");
  });

  test("UPDATE_TOAST should update an existing toast", () => {
    const existingToast: ToasterToast = { id: "1", title: "Original", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [existingToast] };
    const update: Partial<ToasterToast> = { id: "1", title: "Updated" };
    const action: Action = { type: "UPDATE_TOAST", toast: update };
    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].title).toBe("Updated");
    expect(newState.toasts[0].id).toBe("1");
    expect(newState.toasts[0].open).toBe(true);
  });

  test("UPDATE_TOAST should ignore if toast id not found", () => {
    const existingToast: ToasterToast = { id: "1", title: "Original", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [existingToast] };
    const update: Partial<ToasterToast> = { id: "2", title: "Updated" };
    const action: Action = { type: "UPDATE_TOAST", toast: update };
    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0]).toEqual(existingToast);
  });

  test("DISMISS_TOAST with id should mark toast as closed", () => {
    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast;
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [t1, t2] };
    const action: Action = { type: "DISMISS_TOAST", toastId: "1" };
    const newState = reducer(state, action);

    expect(newState.toasts.find(t => t.id === "1")?.open).toBe(false);
    expect(newState.toasts.find(t => t.id === "2")?.open).toBe(true);
  });

  test("DISMISS_TOAST without id should mark all toasts as closed", () => {
    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast;
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [t1, t2] };
    const action: Action = { type: "DISMISS_TOAST" };
    const newState = reducer(state, action);

    expect(newState.toasts.every(t => t.open === false)).toBe(true);
  });

  test("REMOVE_TOAST with id should remove the toast", () => {
    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast;
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [t1, t2] };
    const action: Action = { type: "REMOVE_TOAST", toastId: "1" };
    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].id).toBe("2");
  });

  test("REMOVE_TOAST without id should remove all toasts", () => {
    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast;
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast;
    const state: State = { toasts: [t1, t2] };
    const action: Action = { type: "REMOVE_TOAST" };
    const newState = reducer(state, action);

    expect(newState.toasts).toHaveLength(0);
  });
});
