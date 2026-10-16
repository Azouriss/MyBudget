import { useAppStore } from '../useAppStore';

beforeEach(() => useAppStore.getState().clearNotice());

test('a repeated confirmation creates a new notice so its countdown restarts', () => {
  useAppStore.getState().showNotice('Jour de paie enregistré');
  const firstId = useAppStore.getState().noticeId;
  useAppStore.getState().showNotice('Jour de paie enregistré');
  expect(useAppStore.getState().notice).toBe('Jour de paie enregistré');
  expect(useAppStore.getState().noticeId).not.toBe(firstId);
});

test('the expiry of an earlier notice cannot dismiss its replacement', () => {
  useAppStore.getState().showNotice('Budget enregistré');
  const firstId = useAppStore.getState().noticeId;
  useAppStore.getState().showNotice('Jour de paie enregistré');
  useAppStore.getState().clearNotice(firstId);
  expect(useAppStore.getState().notice).toBe('Jour de paie enregistré');
  useAppStore.getState().clearNotice(useAppStore.getState().noticeId);
  expect(useAppStore.getState().notice).toBeNull();
});

test('a delayed dismissal cannot hide a new notice shown after manual closure', () => {
  useAppStore.getState().showNotice('Dépense enregistrée');
  const firstId = useAppStore.getState().noticeId;
  useAppStore.getState().clearNotice();
  useAppStore.getState().showNotice('Revenu enregistré');
  useAppStore.getState().clearNotice(firstId);
  expect(useAppStore.getState().notice).toBe('Revenu enregistré');
});
