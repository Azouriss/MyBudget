import unittest
from unittest.mock import Mock, patch

from tag_frontend import ensure_tag, main, version_tag


class TagTests(unittest.TestCase):
    def test_refuses_forks_and_other_branches_before_api_access(self):
        for repo, ref in [('someone/MyBudget', 'refs/heads/main'),
                          ('Azouriss/MyBudget', 'refs/heads/feature')]:
            with self.subTest(repo=repo, ref=ref), patch.dict('os.environ', {
                'GITHUB_REPOSITORY': repo, 'GITHUB_REF': ref,
                'GITHUB_EVENT_NAME': 'workflow_dispatch',
            }, clear=True), patch('tag_frontend.urlopen') as request:
                with self.assertRaises(ValueError):
                    main()
                request.assert_not_called()

    def test_refuses_pull_request_events_before_api_access(self):
        with patch.dict('os.environ', {
            'GITHUB_REPOSITORY': 'Azouriss/MyBudget',
            'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'pull_request_target',
        }, clear=True), patch('tag_frontend.urlopen') as request:
            with self.assertRaises(ValueError):
                main()
            request.assert_not_called()

    def test_uses_first_version_not_old_history(self):
        self.assertEqual(version_tag('# Versions\n\n## 2.4.0.0 — 2026-10-16\n\n## 2.3.0.0 — 2026-10-15'),
                         'frontend-v2.4.0.0')

    def test_rejects_invalid_first_heading(self):
        for heading in ('0.1.0', '01.1.0.0', '0.1.0.0;echo test', 'Unreleased'):
            with self.subTest(heading=heading), self.assertRaises(ValueError):
                version_tag(f'## {heading} — 2026-10-16\n## 0.1.0.0 — 2026-10-15')

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


if __name__ == '__main__':
    unittest.main()
