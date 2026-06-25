const { describe, test, expect } = require("bun:test");
const {
  getMeetingEmailHtml,
  getMeetingInviteTextVersion,
  getSupportNotificationTemplate
} = require("./emailTemplates");

describe("Email Templates", () => {
  describe("getMeetingEmailHtml", () => {
    test("should return valid HTML string with correct data", () => {
      const data = {
        inviterName: "Alice",
        attendeeName: "Bob",
        meetingTopic: "Project Sync",
        date: "October 24, 2023",
        time: "10:00 AM",
        meetingLink: "https://meet.google.com/abc-defg-hij"
      };

      const result = getMeetingEmailHtml(data);

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
      expect(result).toContain("October 24, 2023");
      expect(result).toContain("10:00 AM");
      expect(result).toContain("https://meet.google.com/abc-defg-hij");
    });
  });

  describe("getMeetingInviteTextVersion", () => {
    test("should return plain text string with provided data", () => {
      const data = {
        recipientName: "Bob",
        senderName: "Alice",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        meetingDate: "2023-10-24T10:00:00Z",
        meetingTime: "2023-10-24T10:00:00Z",
        projectName: "Project Alpha"
      };

      const result = getMeetingInviteTextVersion(data);

      expect(result).toContain("Hey Bob");
      expect(result).toContain("Alice wants to build software together with you");
      expect(result).toContain("Topic: Project Alpha");
      expect(result).toContain("https://meet.google.com/abc-defg-hij");

      expect(result).not.toContain("Date: Today");
      expect(result).not.toContain("Time: Now");
    });

    test("should use default values when optional parameters are missing", () => {
      const data = {
        meetingUrl: "https://meet.google.com/abc-defg-hij"
      };

      const result = getMeetingInviteTextVersion(data);

      expect(result).toContain("Hey there");
      expect(result).toContain("A colleague wants to build software together with you");
      expect(result).toContain("Topic: Instant Meeting");
      expect(result).toContain("Date: Today");
      expect(result).toContain("Time: Now");
      expect(result).toContain("https://meet.google.com/abc-defg-hij");
    });
  });

  describe("getSupportNotificationTemplate", () => {
    test("should return HTML string with user details", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        userEmail: "john@example.com",
        message: "I need help with login.",
        timestamp: new Date("2023-10-24T12:00:00Z")
      };

      const result = getSupportNotificationTemplate(data);

      expect(result).toContain("John Doe");
      expect(result).toContain("john@example.com");
      expect(result).toContain("I need help with login.");
      expect(result).toContain("From User");

      expect(result).toContain("2023");
    });

    test("should include phone number if provided", () => {
      const data = {
        firstName: "Jane",
        lastName: "Smith",
        userEmail: "jane@example.com",
        phone: "+1234567890",
        message: "Call me back."
      };

      const result = getSupportNotificationTemplate(data);

      expect(result).toContain("+1234567890");
    });

    test("should format message newlines as <br/>", () => {
      const data = {
        firstName: "User",
        lastName: "Test",
        userEmail: "test@example.com",
        message: "Line 1\nLine 2"
      };

      const result = getSupportNotificationTemplate(data);

      expect(result).toContain("Line 1<br/>Line 2");
    });
  });
});
