"""Create an immutable frontend tag; never build an APK or publish a release."""

import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def version_tag(history):
    heading = next((line for line in history.splitlines() if line.startswith('## ')), '')
    number = r'(?:0|[1-9][0-9]*)'
    match = re.fullmatch(rf'## ({number}(?:\.{number}){{3}}) — \d{{4}}-\d{{2}}-\d{{2}}', heading)
    if not match:
        raise ValueError('The first version heading must contain a four-part version and date.')
    return 'frontend-v' + match[1]


def ensure_tag(api, tag, sha):
    reference = api('GET', f'git/ref/tags/{tag}', missing_ok=True)
    if reference is None:
        # No update/delete endpoint: an existing tag can never be moved.
        api('POST', 'git/refs', {'ref': f'refs/tags/{tag}', 'sha': sha})
        return 'Created'
    obj = reference['object']
    # Also accept an existing annotated tag, provided it resolves to this commit.
    for _ in range(8):
        if obj['type'] != 'tag':
            break
        obj = api('GET', f"git/tags/{obj['sha']}")['object']
    if obj['type'] != 'commit' or obj['sha'] != sha:
        raise ValueError(f'{tag} already exists at another target. It will not be moved.')
    return 'Already exists'


def main():
    if (os.environ.get('GITHUB_REPOSITORY') != 'Azouriss/MyBudget'
            or os.environ.get('GITHUB_REF') != 'refs/heads/main'
            or os.environ.get('GITHUB_EVENT_NAME') not in ('push', 'workflow_dispatch')):
        raise ValueError('Tagging is restricted to main in Azouriss/MyBudget.')
    sha = os.environ.get('GITHUB_SHA', '')
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Invalid event commit SHA.')
    token = os.environ.get('GH_TOKEN')
    if not token:
        raise ValueError('The workflow GITHUB_TOKEN is required.')
    tag = version_tag(Path('versions/frontend/VERSION.md').read_text(encoding='utf-8'))

    def api(method, path, data=None, missing_ok=False):
        request = Request(
            'https://api.github.com/repos/Azouriss/MyBudget/' + path,
            data=json.dumps(data).encode() if data is not None else None,
            method=method,
            headers={
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'MyBudget-version-tag',
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            if missing_ok and error.code == 404:
                return None
            # Do not print request headers or response bodies.
            raise RuntimeError(f'GitHub API {method} failed with HTTP {error.code}.') from None

    result = ensure_tag(api, tag, sha)
    message = f'{result}: {tag} at {sha}. No release or APK created.'
    print(message)
    if summary := os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(summary, 'a', encoding='utf-8') as output:
            output.write(message + '\n')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(f'::error::{error}', file=sys.stderr)
        sys.exit(1)
