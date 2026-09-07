import { useLocalSearchParams } from 'expo-router';
import { GraphScreen } from '@/src/features/graph';
import { isConceptId } from '@/src/features/learning';

export default function GraphRoute() {
  const params = useLocalSearchParams<{ conceptId?: string; profileId?: string }>();
  const conceptId =
    typeof params.conceptId === 'string' && isConceptId(params.conceptId) ? params.conceptId : null;
  const profileId =
    typeof params.profileId === 'string' && params.profileId.trim().length > 0
      ? params.profileId.trim()
      : null;

  return <GraphScreen focalConceptId={conceptId} profileId={profileId} />;
}
