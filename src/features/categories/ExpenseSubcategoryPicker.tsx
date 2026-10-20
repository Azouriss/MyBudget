import { t } from '../../i18n/locale';
import { useLanguage } from '../../i18n/useLanguage';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Search, X } from 'lucide-react-native';
import type { Category } from '../../db/schema';
import { FormField } from '../../components/FormField';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { decorativeIconProps } from '../../components/decorativeIconProps';
import { theme } from '../../theme';
import { getExpenseSubcategory, searchExpenseSubcategories } from './subcategories';

type Props = {
  categories: Category[];
  categoryId: string;
  value?: string | null;
  onChange: (categoryId: string, subcategoryId: string | null) => void;
  disabled?: boolean;
  error?: string;
};

export function ExpenseSubcategoryPicker({ categories, categoryId, value, onChange, disabled = false, error }: Props) {
  useLanguage();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    setQuery('');
    setExpanded(false);
    setBrowsing(false);
    setFocused(null);
  }, [categoryId]);
  const selected = getExpenseSubcategory(value);
  const expenseCategories = categories.filter((category) => category.kind === 'expense');
  const labels = new Map(expenseCategories.map((category) => [category.id, t(category.label)]));
  const searching = query.trim().length > 0;
  const results = searching || browsing ? searchExpenseSubcategories(query, categoryId, expenseCategories) : [];
  const visible = expanded ? results : results.slice(0, 5);

  return <View style={styles.field}>
    <FormField label={t("Sous-catégorie (facultatif)")} leadingIcon={Search}
      placeholder={t("Ex. Carburant, pharmacie, restaurant…")} value={query}
      onChangeText={(text) => { setQuery(text); setExpanded(false); setBrowsing(false); }}
      editable={!disabled} maxLength={100} autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} error={error} />
    {selected ? <View style={styles.selection}>
      <View style={styles.copy}>
        <Text style={styles.selectionLabel}>{t(selected.label)}</Text>
        <Text style={styles.help}>{labels.get(selected.categoryId)}</Text>
      </View>
      <IconButton icon={X} label={t("Retirer la sous-catégorie {0}", [t(selected.label)])} disabled={disabled}
        onPress={() => onChange(categoryId, null)} />
    </View> : null}
    {!searching ? <Button variant="secondary" disabled={disabled}
      title={browsing ? t("Masquer les sous-catégories") : t("Parcourir les sous-catégories")}
      onPress={() => { setBrowsing(!browsing); setExpanded(false); }} /> : null}
    {searching || browsing ? <Text accessibilityLiveRegion="polite" style={styles.help}>
      {results.length}{t(" résultat")}{results.length === 1 ? '' : 's'}
    </Text> : null}
    {(searching || browsing) && results.length ? <View accessibilityRole="radiogroup" accessibilityLabel={t("Sous-catégorie")} style={styles.results}>
      {visible.map((subcategory) => <Pressable cssInterop={false} key={subcategory.id}
        accessibilityRole="radio" accessibilityLabel={`${t(subcategory.label)}, ${labels.get(subcategory.categoryId)}`}
        aria-checked={value === subcategory.id}
        accessibilityState={{ checked: value === subcategory.id, disabled }} disabled={disabled}
        onFocus={() => setFocused(subcategory.id)} onBlur={() => setFocused(null)}
        onPress={() => {
          onChange(subcategory.categoryId, subcategory.id);
          setQuery(''); setExpanded(false); setBrowsing(false); Keyboard.dismiss();
        }}
        style={({ pressed }) => [styles.result, {
          backgroundColor: value === subcategory.id || pressed ? theme.colors.primaryLight : theme.colors.surface,
          borderColor: focused === subcategory.id ? theme.colors.focusRing
            : value === subcategory.id ? theme.colors.primaryDark : theme.colors.controlBorder,
        }]}>
        <View style={styles.copy}>
          <Text style={styles.resultLabel}>{t(subcategory.label)}</Text>
          {query.trim() ? <Text style={styles.help}>{labels.get(subcategory.categoryId)}</Text> : null}
        </View>
        {value === subcategory.id ? <Check size={theme.size.icon.small} color={theme.colors.primaryDark} {...decorativeIconProps} /> : null}
      </Pressable>)}
    </View> : searching ? <Text style={styles.help}>{t("Aucun résultat. Essayez un autre mot.")}</Text> : null}
    {results.length > 5 ? <Button variant="secondary" disabled={disabled}
      title={expanded ? t("Réduire la liste") : t("Afficher les {0} autres résultats", [results.length - 5])}
      onPress={() => setExpanded(!expanded)} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm },
  help: { ...theme.typography.caption, color: theme.colors.textSubtle },
  results: { gap: theme.spacing.xs },
  result: { minHeight: theme.size.inputMinHeight, flexDirection: 'row', alignItems: 'center',
    gap: theme.spacing.sm, padding: theme.spacing.md, borderWidth: theme.size.focusWidth, borderRadius: theme.radius.medium },
  copy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  resultLabel: { ...theme.typography.bodySmall, color: theme.colors.textPrimary },
  selection: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    padding: theme.spacing.sm, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.medium },
  selectionLabel: { ...theme.typography.bodySmall, fontFamily: theme.fontFamily.semibold, color: theme.colors.primaryDark },
});
