// Exports all named exports from the local "hooks/useAppInstallStatus" file, making the custom hook and its types available to consumers of the install-wall feature.
export * from "./hooks/useAppInstallStatus";
// Imports the default export from the local "components/InstallPromptView" file and re-exports it as a named export "InstallPromptView", providing a clean entry point for the UI component.
export { default as InstallPromptView } from "./components/InstallPromptView";

