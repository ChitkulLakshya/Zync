import { describe, expect, test } from "vitest"; // Imports the 'describe', 'expect', and 'test' functions from the 'vitest' module, which are used for testing purposes, allowing us to define test suites and assertions.
import { reducer, TOAST_LIMIT } from "./use-toast"; // Imports the 'reducer' function and the 'TOAST_LIMIT' constant from the './use-toast' module, which are used to manage the state of toasts and enforce a limit on the number of toasts.
import type { Action, State, ToasterToast } from "./use-toast"; // Imports the types 'Action', 'State', and 'ToasterToast' from the './use-toast' module, which define the structure of actions, state, and toasts.

describe("use-toast reducer", () => { // Defines a test suite for the 'use-toast' reducer, which is a function that manages the state of toasts.
  const initialState: State = { toasts: [] }; // Initializes the 'initialState' variable with an empty array of toasts, representing the initial state of the reducer.

  test("ADD_TOAST should add a toast to empty state", () => { // Defines a test case to verify that adding a toast to an empty state works as expected.

    const toast: ToasterToast = { id: "1", title: "Test Toast", open: true } as unknown as ToasterToast; // Creates a new 'toast' object with an 'id', 'title', and 'open' property, and casts it to the 'ToasterToast' type.
    const action: Action = { type: "ADD_TOAST", toast }; // Creates a new 'action' object with a 'type' property set to 'ADD_TOAST' and a 'toast' property set to the 'toast' object, which will be used to trigger the addition of the toast.
    const newState = reducer(initialState, action); // Calls the 'reducer' function with the 'initialState' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts).toHaveLength(1); // Asserts that the 'toasts' array in the 'newState' has a length of 1, verifying that the toast was added successfully.
    expect(newState.toasts[0]).toEqual(toast); // Asserts that the first toast in the 'toasts' array is equal to the 'toast' object, verifying that the correct toast was added.
  });

  test(`ADD_TOAST should respect TOAST_LIMIT (${TOAST_LIMIT}) and replace existing toast`, () => { // Defines a test case to verify that adding a toast when the limit is reached replaces the existing toast.

    const existingToast: ToasterToast = { id: "1", title: "Existing", open: true } as unknown as ToasterToast; // Creates a new 'existingToast' object with an 'id', 'title', and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [existingToast] }; // Initializes the 'state' variable with an array containing the 'existingToast' object, representing the current state.
    const newToast: ToasterToast = { id: "2", title: "New", open: true } as unknown as ToasterToast; // Creates a new 'newToast' object with an 'id', 'title', and 'open' property, and casts it to the 'ToasterToast' type.
    const action: Action = { type: "ADD_TOAST", toast: newToast }; // Creates a new 'action' object with a 'type' property set to 'ADD_TOAST' and a 'toast' property set to the 'newToast' object, which will be used to trigger the addition of the new toast.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts).toHaveLength(TOAST_LIMIT); // Asserts that the 'toasts' array in the 'newState' has a length equal to the 'TOAST_LIMIT', verifying that the limit is enforced.

    expect(newState.toasts[0]).toEqual(newToast); // Asserts that the first toast in the 'toasts' array is equal to the 'newToast' object, verifying that the new toast replaced the existing one.
    expect(newState.toasts[0].id).toBe("2"); // Asserts that the 'id' property of the first toast in the 'toasts' array is equal to '2', verifying that the correct toast was added.
  });

  test("UPDATE_TOAST should update an existing toast", () => { // Defines a test case to verify that updating an existing toast works as expected.

    const existingToast: ToasterToast = { id: "1", title: "Original", open: true } as unknown as ToasterToast; // Creates a new 'existingToast' object with an 'id', 'title', and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [existingToast] }; // Initializes the 'state' variable with an array containing the 'existingToast' object, representing the current state.
    const update: Partial<ToasterToast> = { id: "1", title: "Updated" }; // Creates a new 'update' object with an 'id' and 'title' property, which will be used to update the existing toast.
    const action: Action = { type: "UPDATE_TOAST", toast: update }; // Creates a new 'action' object with a 'type' property set to 'UPDATE_TOAST' and a 'toast' property set to the 'update' object, which will be used to trigger the update of the toast.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts).toHaveLength(1); // Asserts that the 'toasts' array in the 'newState' has a length of 1, verifying that the update did not add or remove toasts.
    expect(newState.toasts[0].title).toBe("Updated"); // Asserts that the 'title' property of the first toast in the 'toasts' array is equal to 'Updated', verifying that the toast was updated correctly.
    expect(newState.toasts[0].id).toBe("1"); // Asserts that the 'id' property of the first toast in the 'toasts' array is equal to '1', verifying that the correct toast was updated.
    expect(newState.toasts[0].open).toBe(true); // Asserts that the 'open' property of the first toast in the 'toasts' array is equal to 'true', verifying that the update did not affect the 'open' property.
  });

  test("UPDATE_TOAST should ignore if toast id not found", () => { // Defines a test case to verify that updating a non-existent toast has no effect.

    const existingToast: ToasterToast = { id: "1", title: "Original", open: true } as unknown as ToasterToast; // Creates a new 'existingToast' object with an 'id', 'title', and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [existingToast] }; // Initializes the 'state' variable with an array containing the 'existingToast' object, representing the current state.
    const update: Partial<ToasterToast> = { id: "2", title: "Updated" }; // Creates a new 'update' object with an 'id' and 'title' property, which will be used to update a non-existent toast.
    const action: Action = { type: "UPDATE_TOAST", toast: update }; // Creates a new 'action' object with a 'type' property set to 'UPDATE_TOAST' and a 'toast' property set to the 'update' object, which will be used to trigger the update of the non-existent toast.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts).toHaveLength(1); // Asserts that the 'toasts' array in the 'newState' has a length of 1, verifying that the update did not add or remove toasts.
    expect(newState.toasts[0]).toEqual(existingToast); // Asserts that the first toast in the 'toasts' array is equal to the 'existingToast' object, verifying that the update had no effect.
  });

  test("DISMISS_TOAST with id should mark toast as closed", () => { // Defines a test case to verify that dismissing a toast by id works as expected.

    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast; // Creates a new 't1' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast; // Creates a new 't2' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [t1, t2] }; // Initializes the 'state' variable with an array containing the 't1' and 't2' objects, representing the current state.
    const action: Action = { type: "DISMISS_TOAST", toastId: "1" }; // Creates a new 'action' object with a 'type' property set to 'DISMISS_TOAST' and a 'toastId' property set to '1', which will be used to trigger the dismissal of the toast with id '1'.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts.find(t => t.id === "1")?.open).toBe(false); // Asserts that the 'open' property of the toast with id '1' in the 'newState' is equal to 'false', verifying that the toast was dismissed.
    expect(newState.toasts.find(t => t.id === "2")?.open).toBe(true); // Asserts that the 'open' property of the toast with id '2' in the 'newState' is equal to 'true', verifying that the other toast was not affected.
  });

  test("DISMISS_TOAST without id should mark all toasts as closed", () => { // Defines a test case to verify that dismissing all toasts works as expected.

    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast; // Creates a new 't1' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast; // Creates a new 't2' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [t1, t2] }; // Initializes the 'state' variable with an array containing the 't1' and 't2' objects, representing the current state.
    const action: Action = { type: "DISMISS_TOAST" }; // Creates a new 'action' object with a 'type' property set to 'DISMISS_TOAST', which will be used to trigger the dismissal of all toasts.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts.every(t => t.open === false)).toBe(true); // Asserts that all toasts in the 'newState' have their 'open' property set to 'false', verifying that all toasts were dismissed.
  });

  test("REMOVE_TOAST with id should remove the toast", () => { // Defines a test case to verify that removing a toast by id works as expected.

    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast; // Creates a new 't1' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast; // Creates a new 't2' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [t1, t2] }; // Initializes the 'state' variable with an array containing the 't1' and 't2' objects, representing the current state.
    const action: Action = { type: "REMOVE_TOAST", toastId: "1" }; // Creates a new 'action' object with a 'type' property set to 'REMOVE_TOAST' and a 'toastId' property set to '1', which will be used to trigger the removal of the toast with id '1'.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts).toHaveLength(1); // Asserts that the 'toasts' array in the 'newState' has a length of 1, verifying that one toast was removed.
    expect(newState.toasts[0].id).toBe("2"); // Asserts that the 'id' property of the remaining toast in the 'newState' is equal to '2', verifying that the correct toast was removed.
  });

  test("REMOVE_TOAST without id should remove all toasts", () => { // Defines a test case to verify that removing all toasts works as expected.

    const t1: ToasterToast = { id: "1", open: true } as unknown as ToasterToast; // Creates a new 't1' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const t2: ToasterToast = { id: "2", open: true } as unknown as ToasterToast; // Creates a new 't2' object with an 'id' and 'open' property, and casts it to the 'ToasterToast' type.
    const state: State = { toasts: [t1, t2] }; // Initializes the 'state' variable with an array containing the 't1' and 't2' objects, representing the current state.
    const action: Action = { type: "REMOVE_TOAST" }; // Creates a new 'action' object with a 'type' property set to 'REMOVE_TOAST', which will be used to trigger the removal of all toasts.
    const newState = reducer(state, action); // Calls the 'reducer' function with the 'state' and 'action' as arguments, and assigns the result to the 'newState' variable, which represents the updated state after applying the action.

    expect(newState.toasts).toHaveLength(0); // Asserts that the 'toasts' array in the 'newState' is empty, verifying that all toasts were removed.
  });
});