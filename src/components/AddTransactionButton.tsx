import { t } from '../i18n/locale';
import { useLanguage } from '../i18n/useLanguage';
import { Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { Button } from './Button';

export function AddTransactionButton() {
  useLanguage();
  return <Button title={t("Ajouter une dépense")} icon={Plus} onPress={() => router.push('/transaction')} />;
}
