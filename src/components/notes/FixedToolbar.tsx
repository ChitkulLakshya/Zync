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
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronRight, Share2 } from 'lucide-react';

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
}

// Toolbar Button Component
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
            "hover:bg-zinc-700/50 active:scale-95",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            isActive && "bg-zinc-700 text-white"
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

// Divider Component
const ToolbarDivider = () => (
  <div className="w-px h-6 bg-zinc-700 mx-1" />
);

const FixedToolbar: React.FC<FixedToolbarProps> = ({ editor, className }) => {
  if (!editor) return null;

  // Text formatting handlers
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

  // Block type handlers
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

  // Check active states
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
        "backdrop-blur-md bg-zinc-950/80",
        "border-b border-zinc-800",
        className
      )}
    >
      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo2 size={16} className="text-zinc-400" />}
        tooltip="Undo (Ctrl+Z)"
        onClick={() => editor.undo()}
      />
      <ToolbarButton
        icon={<Redo2 size={16} className="text-zinc-400" />}
        tooltip="Redo (Ctrl+Y)"
        onClick={() => editor.redo()}
      />

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        icon={<Bold size={16} className={cn(activeStyles.bold ? "text-white" : "text-zinc-400")} />}
        tooltip="Bold (Ctrl+B)"
        onClick={toggleBold}
        isActive={!!activeStyles.bold}
      />
      <ToolbarButton
        icon={<Italic size={16} className={cn(activeStyles.italic ? "text-white" : "text-zinc-400")} />}
        tooltip="Italic (Ctrl+I)"
        onClick={toggleItalic}
        isActive={!!activeStyles.italic}
      />
      <ToolbarButton
        icon={<Underline size={16} className={cn(activeStyles.underline ? "text-white" : "text-zinc-400")} />}
        tooltip="Underline (Ctrl+U)"
        onClick={toggleUnderline}
        isActive={!!activeStyles.underline}
      />
      <ToolbarButton
        icon={<Strikethrough size={16} className={cn(activeStyles.strike ? "text-white" : "text-zinc-400")} />}
        tooltip="Strikethrough"
        onClick={toggleStrike}
        isActive={!!activeStyles.strike}
      />
      <ToolbarButton
        icon={<Code size={16} className={cn(activeStyles.code ? "text-white" : "text-zinc-400")} />}
        tooltip="Inline Code"
        onClick={toggleCode}
        isActive={!!activeStyles.code}
      />

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        icon={<Heading1 size={16} className={cn(currentBlockType === "heading" ? "text-white" : "text-zinc-400")} />}
        tooltip="Heading 1"
        onClick={setHeading1}
      />
      <ToolbarButton
        icon={<Heading2 size={16} className="text-zinc-400" />}
        tooltip="Heading 2"
        onClick={setHeading2}
      />
      <ToolbarButton
        icon={<Heading3 size={16} className="text-zinc-400" />}
        tooltip="Heading 3"
        onClick={setHeading3}
      />

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        icon={<List size={16} className={cn(currentBlockType === "bulletListItem" ? "text-white" : "text-zinc-400")} />}
        tooltip="Bullet List"
        onClick={setBulletList}
        isActive={currentBlockType === "bulletListItem"}
      />
      <ToolbarButton
        icon={<ListOrdered size={16} className={cn(currentBlockType === "numberedListItem" ? "text-white" : "text-zinc-400")} />}
        tooltip="Numbered List"
        onClick={setNumberedList}
        isActive={currentBlockType === "numberedListItem"}
      />
      <ToolbarButton
        icon={<CheckSquare size={16} className={cn(currentBlockType === "checkListItem" ? "text-white" : "text-zinc-400")} />}
        tooltip="Checklist"
        onClick={setCheckList}
        isActive={currentBlockType === "checkListItem"}
      />
    </div>
  );
};

export default FixedToolbar;
