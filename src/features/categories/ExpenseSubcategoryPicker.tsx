import { useState } from 'react';
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
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const selected = getExpenseSubcategory(value);
  const expenseCategories = categories.filter((category) => category.kind === 'expense');
  const labels = new Map(expenseCategories.map((category) => [category.id, category.label]));
  const results = searchExpenseSubcategories(query, categoryId, expenseCategories);
  const visible = expanded ? results : results.slice(0, 5);

  return <View style={styles.field}>
    <FormField label="Rechercher une sous-catégorie" leadingIcon={Search}
      placeholder="Ex. Carburant, pharmacie, restaurant…" value={query}
      onChangeText={(text) => { setQuery(text); setExpanded(false); }}
      editable={!disabled} maxLength={100} autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} error={error} />
    <Text style={styles.help}>Facultatif · La recherche couvre les six grandes catégories.</Text>
    {selected ? <View style={styles.selection}>
      <View style={styles.copy}>
        <Text style={styles.selectionLabel}>{selected.label}</Text>
        <Text style={styles.help}>{labels.get(selected.categoryId)}</Text>
      </View>
      <IconButton icon={X} label={`Retirer la sous-catégorie ${selected.label}`} disabled={disabled}
        onPress={() => onChange(categoryId, null)} />
    </View> : null}
    <Text accessibilityLiveRegion="polite" style={styles.help}>{query.trim()
      ? `${results.length} résultat${results.length === 1 ? '' : 's'}`
      : `Suggestions · ${labels.get(categoryId) ?? 'Sous-catégories'}`}</Text>
    {results.length ? <View accessibilityRole="radiogroup" accessibilityLabel="Sous-catégorie" style={styles.results}>
      {visible.map((subcategory) => <Pressable cssInterop={false} key={subcategory.id}
        accessibilityRole="radio" accessibilityLabel={`${subcategory.label}, ${labels.get(subcategory.categoryId)}`}
        aria-checked={value === subcategory.id}
        accessibilityState={{ checked: value === subcategory.id, disabled }} disabled={disabled}
        onFocus={() => setFocused(subcategory.id)} onBlur={() => setFocused(null)}
        onPress={() => {
          onChange(subcategory.categoryId, subcategory.id);
          setQuery(''); setExpanded(false); Keyboard.dismiss();
        }}
        style={({ pressed }) => [styles.result, {
          backgroundColor: value === subcategory.id || pressed ? theme.colors.primaryLight : theme.colors.surface,
          borderColor: focused === subcategory.id ? theme.colors.focusRing
            : value === subcategory.id ? theme.colors.primaryDark : theme.colors.controlBorder,
        }]}>
        <View style={styles.copy}>
          <Text style={styles.resultLabel}>{subcategory.label}</Text>
          {query.trim() ? <Text style={styles.help}>{labels.get(subcategory.categoryId)}</Text> : null}
        </View>
        {value === subcategory.id ? <Check size={theme.size.icon.small} color={theme.colors.primaryDark} {...decorativeIconProps} /> : null}
      </Pressable>)}
    </View> : <Text style={styles.help}>Aucune sous-catégorie trouvée. Essayez un autre mot ou gardez uniquement la catégorie principale.</Text>}
    {results.length > 5 ? <Button variant="secondary" disabled={disabled}
      title={expanded ? 'Réduire la liste' : `Afficher les ${results.length - 5} autres résultats`}
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
