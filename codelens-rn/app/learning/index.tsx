import { useLocalSearchParams } from 'expo-router';
import { LearningHubScreen } from '@/src/features/learning';

export default function LearningRoute() {
  const { projectId: rawProjectId } = useLocalSearchParams<{ projectId?: string }>();
  const projectId = typeof rawProjectId === 'string' && rawProjectId.trim().length > 0
    ? rawProjectId.trim()
    : null;

  return <LearningHubScreen projectId={projectId} />;
}
