import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from tag_version import ensure_tag, main, prune_tags, version_tag


class TagTests(unittest.TestCase):
    def test_refuses_forks_and_other_branches_before_api_access(self):
        for repo, ref in [('someone/MyBudget', 'refs/heads/main'),
                          ('Azouriss/MyBudget', 'refs/heads/feature')]:
            with self.subTest(repo=repo, ref=ref), patch.dict('os.environ', {
                'GITHUB_REPOSITORY': repo, 'GITHUB_REF': ref,
                'GITHUB_EVENT_NAME': 'workflow_dispatch',
            }, clear=True), patch('tag_version.urlopen') as request:
                with self.assertRaises(ValueError):
                    main()
                request.assert_not_called()

    def test_refuses_pull_request_events_before_api_access(self):
        with patch.dict('os.environ', {
            'GITHUB_REPOSITORY': 'Azouriss/MyBudget',
            'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'pull_request_target',
        }, clear=True), patch('tag_version.urlopen') as request:
            with self.assertRaises(ValueError):
                main()
            request.assert_not_called()

    def test_tags_each_platform_from_commit_title(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            for platform in ['frontend', 'docs', 'tooling']:
                history = root / 'versions' / platform / 'VERSION.md'
                history.parent.mkdir(parents=True)
                history.write_text('## 2.4.0.0 — 2026-10-16\n## 2.3.0.0 — 2026-10-15')
                self.assertEqual(version_tag(f'✏️ {platform}@v2.4.0.0 update content', root),
                                 f'{platform}-v2.4.0.0')
                with self.assertRaises(ValueError):
                    version_tag(f'✏️ {platform}@v2.3.0.0 update content', root)

    def test_rejects_invalid_titles_and_path_traversal(self):
        for title in ('fix something', '🐛 docs@v0.1.0 fix', '🐛 docs@v01.1.0.0 fix',
                      '🐛 ../docs@v0.1.0.0 fix', '🐛 docs@v0.1.0.0;echo fix'):
            with self.subTest(title=title), self.assertRaises(ValueError):
                version_tag(title)

    def test_accepts_current_and_legacy_history_separators(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            history = root / 'versions' / 'frontend' / 'VERSION.md'
            history.parent.mkdir(parents=True)
            for separator in ('-', '\u2014'):
                with self.subTest(separator=separator):
                    history.write_text(
                        f'# Frontend version history\n\n## 0.8.0.0 {separator} 2026-10-22\n',
                        encoding='utf-8',
                    )
                    self.assertEqual(version_tag(
                        '➡️ frontend@v0.8.0.0 add recurring income and payday budget periods', root,
                    ), 'frontend-v0.8.0.0')

    def test_refuses_mismatched_or_malformed_first_history_entry(self):
        with TemporaryDirectory() as directory:
            root = Path(directory)
            history = root / 'versions' / 'frontend' / 'VERSION.md'
            history.parent.mkdir(parents=True)
            for heading in (
                '## 0.7.0.0 - 2026-10-20',
                '## 0.7.0.0 \u2014 2026-10-20',
                '## 0.8.0.0 / 2026-10-22',
                '## 0.8.0.0 - 22/10/2026',
                '## 0.8.0.0 - 2026-10-22 extra',
                '## Notes',
            ):
                with self.subTest(heading=heading):
                    history.write_text(
                        f'{heading}\n\n## 0.8.0.0 - 2026-10-22\n', encoding='utf-8',
                    )
                    with self.assertRaisesRegex(ValueError, 'first entry'):
                        version_tag('➡️ frontend@v0.8.0.0 add recurring income', root)

    def test_creates_only_tag_at_event_commit(self):
        api = Mock(side_effect=[None, {}])
        self.assertEqual(ensure_tag(api, 'frontend-v0.1.0.0', 'a' * 40), 'Created')
        self.assertEqual(api.call_count, 2)
        api.assert_called_with('POST', 'git/refs', {'ref': 'refs/tags/frontend-v0.1.0.0', 'sha': 'a' * 40})

    def test_repeat_is_read_only(self):
        api = Mock(return_value={'object': {'type': 'commit', 'sha': 'a' * 40}})
        self.assertEqual(ensure_tag(api, 'frontend-v0.1.0.0', 'a' * 40), 'Already exists')
        self.assertEqual(api.call_count, 1)

    def test_never_moves_existing_tag(self):
        api = Mock(return_value={'object': {'type': 'commit', 'sha': 'b' * 40}})
        with self.assertRaisesRegex(ValueError, 'will not be moved'):
            ensure_tag(api, 'frontend-v0.1.0.0', 'a' * 40)
        self.assertEqual(api.call_count, 1)

    def test_accepts_annotated_tag_on_same_commit(self):
        api = Mock(side_effect=[{'object': {'type': 'tag', 'sha': 'b' * 40}},
                                {'object': {'type': 'commit', 'sha': 'a' * 40}}])
        self.assertEqual(ensure_tag(api, 'frontend-v0.1.0.0', 'a' * 40), 'Already exists')
        self.assertTrue(all(call.args[0] == 'GET' for call in api.call_args_list))

    def test_api_failure_does_not_attempt_creation(self):
        api = Mock(side_effect=RuntimeError('HTTP 403'))
        with self.assertRaises(RuntimeError):
            ensure_tag(api, 'frontend-v0.1.0.0', 'a' * 40)
        self.assertEqual(api.call_count, 1)

    def retention_api(self, names):
        refs = [{'ref': f'refs/tags/{name}', 'object': {'type': 'commit', 'sha': str(i) * 40}}
                for i, name in enumerate(names, 1)]
        def respond(method, path, data=None, missing_ok=False):
            if path == 'git/matching-refs/tags/':
                return list(reversed(refs))
            if path.startswith('git/commits/'):
                return {'committer': {'date': f'2026-10-0{path[-1]}T12:00:00Z'}}
            if method == 'GET' and path.startswith('git/ref/'):
                return next(ref for ref in refs if ref['ref'] == 'refs/' + path[8:])
            if method == 'DELETE':
                return None
            raise AssertionError((method, path))
        return Mock(side_effect=respond), refs

    def test_retains_three_across_platforms_and_ignores_other_tags(self):
        names = ['frontend-v0.1.0.0', 'tooling-v0.1.1.0', 'docs-v0.1.1.0',
                 'tooling-v0.1.2.0', 'manual-backup']
        api, _ = self.retention_api(names)
        self.assertEqual(prune_tags(api, names[3], '4' * 40), [names[0]])
        deleted = [call.args[1] for call in api.call_args_list if call.args[0] == 'DELETE']
        self.assertEqual(deleted, ['git/refs/tags/frontend-v0.1.0.0'])

    def test_no_deletion_with_three_tags(self):
        names = ['frontend-v0.1.0.0', 'docs-v0.1.1.0', 'tooling-v0.1.2.0']
        api, _ = self.retention_api(names)
        self.assertEqual(prune_tags(api, names[-1], '3' * 40), [])
        self.assertTrue(all(call.args[0] == 'GET' for call in api.call_args_list))

    def test_prunes_all_excess_tags_by_date_not_version_number(self):
        names = ['frontend-v9.0.0.0', 'docs-v8.0.0.0', 'tooling-v0.1.0.0',
                 'docs-v0.1.0.0', 'frontend-v0.1.0.0']
        api, _ = self.retention_api(names)
        self.assertEqual(prune_tags(api, names[-1], '5' * 40), [names[1], names[0]])
        self.assertEqual(sum(call.args[0] == 'DELETE' for call in api.call_args_list), 2)

    def test_annotated_tag_uses_commit_date_for_retention(self):
        names = ['frontend-v0.1.0.0', 'docs-v0.1.0.0', 'tooling-v0.1.0.0', 'docs-v0.1.1.0']
        api, refs = self.retention_api(names)
        refs[0]['object'] = {'type': 'tag', 'sha': 'a' * 40}
        original = api.side_effect
        def annotated(method, path, **kwargs):
            if path == 'git/tags/' + 'a' * 40:
                return {'object': {'type': 'commit', 'sha': '1' * 40}}
            return original(method, path, **kwargs)
        api.side_effect = annotated
        self.assertEqual(prune_tags(api, names[-1], '4' * 40), [names[0]])

    def test_missing_current_tag_prevents_all_cleanup(self):
        api, _ = self.retention_api(['frontend-v0.1.0.0'])
        with self.assertRaises(ValueError):
            prune_tags(api, 'docs-v0.1.1.0', '2' * 40)
        self.assertEqual(api.call_count, 1)

    def test_metadata_failure_prevents_all_cleanup(self):
        names = ['frontend-v0.1.0.0', 'tooling-v0.1.1.0', 'docs-v0.1.1.0', 'tooling-v0.1.2.0']
        api, _ = self.retention_api(names)
        original = api.side_effect
        def fail(method, path, **kwargs):
            if path.startswith('git/commits/'):
                raise RuntimeError('HTTP 403')
            return original(method, path, **kwargs)
        api.side_effect = fail
        with self.assertRaises(RuntimeError):
            prune_tags(api, names[-1], '4' * 40)
        self.assertTrue(all(call.args[0] == 'GET' for call in api.call_args_list))

    def test_changed_reference_is_not_deleted(self):
        names = ['frontend-v0.1.0.0', 'tooling-v0.1.1.0', 'docs-v0.1.1.0', 'tooling-v0.1.2.0']
        api, _ = self.retention_api(names)
        original = api.side_effect
        def changed(method, path, **kwargs):
            if path.startswith('git/ref/'):
                return {'object': {'type': 'commit', 'sha': 'f' * 40}}
            return original(method, path, **kwargs)
        api.side_effect = changed
        with self.assertRaisesRegex(ValueError, 'changed during cleanup'):
            prune_tags(api, names[-1], '4' * 40)
        self.assertTrue(all(call.args[0] == 'GET' for call in api.call_args_list))


if __name__ == '__main__':
    unittest.main()
