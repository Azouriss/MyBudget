import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { useDatabase } from '../src/db/DatabaseProvider';
import { forecastStyles as styles } from '../src/features/forecast/styles';
import { ProvisionForm } from '../src/features/provisions/ProvisionForm';
import { createProvisionRepository } from '../src/features/provisions/repository';

export default function ProvisionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useDatabase();
  const repository = useMemo(() => createProvisionRepository(db), [db]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ id?: string; loaded?: boolean; failed?: boolean;
    initial?: ReturnType<typeof repository.find>; movements?: ReturnType<typeof repository.movements> }>({});
  useEffect(() => {
    try {
      const initial = id ? repository.find(id) : undefined;
      if (id && !initial) throw new Error('Objectif introuvable.');
      setState({ id, initial, movements: id ? repository.movements(id) : [], loaded: true });
    } catch { setState({ id, failed: true }); }
  }, [id, repository, attempt]);
  if (state.loaded && state.id === id) return <ProvisionForm key={id ?? 'new'} repository={repository} initial={state.initial} initialMovements={state.movements!} />;
  return <ScreenContainer inTabs={false}><View style={styles.page}>
    <Text style={styles.note}>{state.failed ? 'Provision introuvable ou indisponible. Vos données sont conservées.' : 'Chargement de la provision…'}</Text>
    <Button title="Réessayer" onPress={() => setAttempt((value) => value + 1)} />
    <Button title="Retour aux prévisions" onPress={() => router.replace('/forecast')} variant="secondary" />
  </View></ScreenContainer>;
}
