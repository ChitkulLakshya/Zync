import { describe, expect, test, vi } from "vitest";


vi.mock("clsx", () => ({
  clsx: (...inputs: any[]) => {
    return inputs
      .flat()
      .map(input => {
        if (typeof input === "string") {return input;}
        if (typeof input === "object" && input !== null) {
          return Object.entries(input)
            .filter(([_, value]) => !!value)
            .map(([key]) => key)
            .join(" ");
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  },
}));

vi.mock("tailwind-merge", () => ({
  twMerge: (input: string) => input,
}));


const { cn, getFullUrl, getUserName, getUserInitials, pickUserForDisplay } = await import("./utils");

describe("utils.ts", () => {
  describe("cn", () => {
    test("should merge class names", () => {
      expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
    });

    test("should handle conditional classes", () => {
      const isActive = true;
      const isHidden = false;
      expect(cn("btn", isActive && "btn-active", isHidden && "btn-hidden")).toBe("btn btn-active");
    });

    test("should handle objects", () => {
      expect(cn("btn", { "btn-active": true, "btn-hidden": false })).toBe("btn btn-active");
    });
  });

  describe("getFullUrl", () => {
    test("should return empty string for empty path", () => {
      expect(getFullUrl(null)).toBe("");
      expect(getFullUrl(undefined)).toBe("");
      expect(getFullUrl("")).toBe("");
    });

    test("should return original path if it starts with http or blob:", () => {
      expect(getFullUrl("https://example.com/image.png")).toBe("https://example.com/image.png");
      expect(getFullUrl("http://example.com/image.png")).toBe("http://example.com/image.png");
      expect(getFullUrl("blob:http://localhost:5173/uuid")).toBe("blob:http://localhost:5173/uuid");
    });

    test("should handle relative paths", () => {


      expect(getFullUrl("/uploads/image.png")).toBe("/uploads/image.png");
      expect(getFullUrl("uploads/image.png")).toBe("/uploads/image.png");
    });
  });

  describe("getUserName", () => {
    test("should return displayName if available", () => {
      const user = { displayName: "John Doe" };
      expect(getUserName(user)).toBe("John Doe");
    });

    test("should return combined firstName and lastName", () => {
      const user = { firstName: "John", lastName: "Doe" };
      expect(getUserName(user)).toBe("John Doe");
    });

    test("should return only firstName if lastName is missing", () => {
      const user = { firstName: "John" };
      expect(getUserName(user)).toBe("John");
    });

    test("should return name if available", () => {
      const user = { name: "John Doe" };
      expect(getUserName(user)).toBe("John Doe");
    });

    test("should return part of email if no name fields are available", () => {
      const user = { email: "john.doe@example.com" };
      expect(getUserName(user)).toBe("john.doe");
    });

    test("should return 'User' if no user provided or no fields available", () => {
      expect(getUserName(null)).toBe("User");
      expect(getUserName({})).toBe("User");
    });
  });

  describe("getUserInitials", () => {
    test("should return first two letters of name in uppercase", () => {
      expect(getUserInitials({ displayName: "John Doe" })).toBe("JO");
    });

    test("should work with email-based names", () => {
      expect(getUserInitials({ email: "bob@example.com" })).toBe("BO");
    });

    test("should return 'US' for default 'User'", () => {
      expect(getUserInitials(null)).toBe("US");
    });

    test("should use email for initials when name resolves to User", () => {
      expect(getUserInitials({ email: "alice@example.com", displayName: "User" })).toBe("AL");
    });
  });

  describe("pickUserForDisplay", () => {
    test("should prefer backend user when uid is set", () => {
      const backend = { uid: "x", displayName: "Backend" };
      const fb = { uid: "x", displayName: "Firebase" };
      expect(pickUserForDisplay(backend, fb)).toBe(backend);
    });

    test("should fall back to Firebase when userData has no uid", () => {
      const fb = { displayName: "Firebase User", email: "f@example.com" };
      expect(pickUserForDisplay({}, fb)).toBe(fb);
      expect(pickUserForDisplay(null, fb)).toBe(fb);
    });
  });
});
