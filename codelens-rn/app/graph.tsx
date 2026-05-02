import { useLocalSearchParams } from 'expo-router';
import { GraphScreen } from '@/src/features/graph';
import { isConceptId } from '@/src/features/learning';

export default function GraphRoute() {
  const params = useLocalSearchParams<{ conceptId?: string }>();
  const conceptId =
    typeof params.conceptId === 'string' && isConceptId(params.conceptId) ? params.conceptId : null;

  return <GraphScreen focalConceptId={conceptId} />;
}
