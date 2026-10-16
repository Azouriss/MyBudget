import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { Button } from './Button';

export function AddTransactionButton() {
  return <Button title="Ajouter une dépense" icon={Plus} onPress={() => router.push('/transaction')} />;
}
