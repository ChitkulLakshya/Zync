/**
 * @fileoverview FixedToolbar.tsx
 * @module FixedToolbar
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import React from 'react';
import { BlockNoteEditor } from "@blocknote/core";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Undo2,
  Redo2,
  Link,
  Plus,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActiveUser {
  id: string;
  name?: string;
  color?: string;
  avatarUrl?: string;
}

interface FixedToolbarProps {
  editor: BlockNoteEditor | null;
  className?: string;
  breadcrumbs?: string[];
  activeUsers?: ActiveUser[];
  onShare?: () => void;
  onLinkTask?: () => void;
  onAddTask?: () => void;
}


const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}> = ({ icon, tooltip, onClick, isActive = false, disabled = false }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "p-2 rounded-md transition-all duration-150",
            "hover:bg-secondary/50 active:scale-95",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            isActive && "bg-secondary text-foreground"
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);


const ToolbarDivider = () => (
  <div className="w-px h-6 bg-border/10 mx-1" />
);

const FixedToolbar: React.FC<FixedToolbarProps> = ({ editor, className, onLinkTask, onAddTask }) => {
  if (!editor) {return null;}


  const toggleBold = () => {
    editor.toggleStyles({ bold: true });
  };

  const toggleItalic = () => {
    editor.toggleStyles({ italic: true });
  };

  const toggleUnderline = () => {
    editor.toggleStyles({ underline: true });
  };

  const toggleStrike = () => {
    editor.toggleStyles({ strike: true });
  };

  const toggleCode = () => {
    editor.toggleStyles({ code: true });
  };


  const setHeading1 = () => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: "heading",
      props: { level: 1 }
    });
  };

  const setHeading2 = () => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: "heading",
      props: { level: 2 }
    });
  };

  const setHeading3 = () => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: "heading",
      props: { level: 3 }
    });
  };

  const setBulletList = () => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: "bulletListItem"
    });
  };

  const setNumberedList = () => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: "numberedListItem"
    });
  };

  const setCheckList = () => {
    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: "checkListItem"
    });
  };


  const getActiveStyles = () => {
    try {
      return editor.getActiveStyles();
    } catch {
      return {};
    }
  };

  const getCurrentBlockType = () => {
    try {
      return editor.getTextCursorPosition().block.type;
    } catch {
      return "paragraph";
    }
  };

  const activeStyles = getActiveStyles();
  const currentBlockType = getCurrentBlockType();

  return (
    <div
      className={cn(
        "sticky top-0 z-50",
        "flex items-center gap-0.5 px-4 py-2",
        "backdrop-blur-md bg-background/80",
        "border-b border-border/10",
        className
      )}
    >
      {}
      <ToolbarButton
        icon={<Undo2 size={16} className="text-muted-foreground" />}
        tooltip="Undo (Ctrl+Z)"
        onClick={() => editor.undo()}
      />
      <ToolbarButton
        icon={<Redo2 size={16} className="text-muted-foreground" />}
        tooltip="Redo (Ctrl+Y)"
        onClick={() => editor.redo()}
      />

      <ToolbarDivider />

      {}
      <ToolbarButton
        icon={<Bold size={16} className={cn(activeStyles.bold ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Bold (Ctrl+B)"
        onClick={toggleBold}
        isActive={!!activeStyles.bold}
      />
      <ToolbarButton
        icon={<Italic size={16} className={cn(activeStyles.italic ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Italic (Ctrl+I)"
        onClick={toggleItalic}
        isActive={!!activeStyles.italic}
      />
      <ToolbarButton
        icon={<Underline size={16} className={cn(activeStyles.underline ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Underline (Ctrl+U)"
        onClick={toggleUnderline}
        isActive={!!activeStyles.underline}
      />
      <ToolbarButton
        icon={<Strikethrough size={16} className={cn(activeStyles.strike ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Strikethrough"
        onClick={toggleStrike}
        isActive={!!activeStyles.strike}
      />
      <ToolbarButton
        icon={<Code size={16} className={cn(activeStyles.code ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Inline Code"
        onClick={toggleCode}
        isActive={!!activeStyles.code}
      />

      <ToolbarDivider />

      {}
      <ToolbarButton
        icon={<Heading1 size={16} className={cn(currentBlockType === "heading" ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Heading 1"
        onClick={setHeading1}
      />
      <ToolbarButton
        icon={<Heading2 size={16} className="text-muted-foreground" />}
        tooltip="Heading 2"
        onClick={setHeading2}
      />
      <ToolbarButton
        icon={<Heading3 size={16} className="text-muted-foreground" />}
        tooltip="Heading 3"
        onClick={setHeading3}
      />

      <ToolbarDivider />

      {}
      <ToolbarButton
        icon={<List size={16} className={cn(currentBlockType === "bulletListItem" ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Bullet List"
        onClick={setBulletList}
        isActive={currentBlockType === "bulletListItem"}
      />
      <ToolbarButton
        icon={<ListOrdered size={16} className={cn(currentBlockType === "numberedListItem" ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Numbered List"
        onClick={setNumberedList}
        isActive={currentBlockType === "numberedListItem"}
      />
      <ToolbarButton
        icon={<CheckSquare size={16} className={cn(currentBlockType === "checkListItem" ? "text-foreground" : "text-muted-foreground")} />}
        tooltip="Checklist"
        onClick={setCheckList}
        isActive={currentBlockType === "checkListItem"}
      />

      {}
      {(onLinkTask || onAddTask) && (
        <>
          <ToolbarDivider />
          {onLinkTask && (
            <ToolbarButton
              icon={<Link size={16} className="text-muted-foreground" />}
              tooltip="Search and Link Existing Task"
              onClick={onLinkTask}
            />
          )}
          {onAddTask && (
            <ToolbarButton
              icon={<Plus size={16} className="text-muted-foreground" />}
              tooltip="Create Task from Selection"
              onClick={onAddTask}
            />
          )}
        </>
      )}
    </div>
  );
};

export default FixedToolbar;
