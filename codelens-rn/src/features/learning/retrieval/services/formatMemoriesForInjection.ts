// The formatter moved to ../formatting/ so chat/Stage 8 code can import a
// pure, native-deps-free public path. Existing services-relative deep imports
// keep working through this re-export.
export { formatMemoriesForInjection } from '../formatting/formatMemoriesForInjection';
