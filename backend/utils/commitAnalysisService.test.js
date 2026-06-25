const { describe, test, expect } = require("bun:test");
const { filterCommitMessage } = require("./commitAnalysisService");

describe("commitAnalysisService - filterCommitMessage", () => {
    test("should find and normalize TASK-ID (TASK-123)", () => {
        const message = "Implement feature for TASK-123";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-123");
        expect(result.action).toBe("In Progress");
        expect(result.confidence).toBe(0.8);
    });

    test("should find and normalize hash ID (#123)", () => {
        const message = "Work on #123";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-123");
        expect(result.action).toBe("In Progress");
        expect(result.confidence).toBe(0.8);
    });

    test("should handle lowercase task id (task-456)", () => {
        const message = "Update task-456 logic";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-456");
        expect(result.action).toBe("In Progress");
    });

    test("should detect 'fix' action as Complete", () => {
        const message = "Fix bug in TASK-789";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-789");
        expect(result.action).toBe("Complete");
    });

    test("should detect 'fixes' action as Complete", () => {
        const message = "Fixes #101 issue";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-101");
        expect(result.action).toBe("Complete");
    });

    test("should detect 'fixed' action as Complete", () => {
        const message = "Fixed styling on TASK-202";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-202");
        expect(result.action).toBe("Complete");
    });

    test("should default action to In Progress if no fix keyword", () => {
        const message = "Refactor code for #303";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(true);
        expect(result.id).toBe("TASK-303");
        expect(result.action).toBe("In Progress");
    });

    test("should return not found if no ID present", () => {
        const message = "Just a regular commit message";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(false);
        expect(result.id).toBeNull();
        expect(result.action).toBeNull();
        expect(result.confidence).toBe(0);
    });

    test("should handle empty string", () => {
        const message = "";
        const result = filterCommitMessage(message);
        expect(result.found).toBe(false);
    });
});
