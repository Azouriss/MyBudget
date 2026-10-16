"""Tag the pushed commit and retain three version tags; never publish releases."""

from datetime import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen


NUMBER = r'(?:0|[1-9][0-9]*)'
VERSION = rf'{NUMBER}(?:\.{NUMBER}){{3}}'
PLATFORM = r'[a-z][a-z0-9_-]*'
TAG = re.compile(rf'{PLATFORM}-v{VERSION}')
TITLE = re.compile(rf'(?:➡️|⛔|✏️|🐛|🔒|⚙️|🎨|📦) ({PLATFORM})@v({VERSION}) .+')


def version_tag(title, root=Path('.')):
    match = TITLE.fullmatch(title)
    if not match:
        raise ValueError('Commit title must follow: <emoji> <platform>@vMAJOR.MINOR.PATCH.FIX <description>.')
    platform, version = match.groups()
    history = (root / 'versions' / platform / 'VERSION.md').read_text(encoding='utf-8')
    heading = next((line for line in history.splitlines() if line.startswith('## ')), '')
    if not re.fullmatch(rf'## {re.escape(version)} — \d{{4}}-\d{{2}}-\d{{2}}', heading):
        raise ValueError('Commit version must match the first entry in its platform history.')
    return f'{platform}-v{version}'


def commit_target(api, obj):
    for _ in range(8):
        if obj['type'] == 'commit' and re.fullmatch(r'[0-9a-f]{40}', obj['sha']):
            return obj['sha']
        if obj['type'] != 'tag' or not re.fullmatch(r'[0-9a-f]{40}', obj['sha']):
            break
        obj = api('GET', f"git/tags/{obj['sha']}")['object']
    raise ValueError('Version tag does not resolve to a commit.')


def ensure_tag(api, tag, sha):
    reference = api('GET', f'git/ref/tags/{tag}', missing_ok=True)
    if reference is None:
        # Never update an existing tag to another commit.
        api('POST', 'git/refs', {'ref': f'refs/tags/{tag}', 'sha': sha})
        return 'Created'
    if commit_target(api, reference['object']) != sha:
        raise ValueError(f'{tag} already exists at another target. It will not be moved.')
    return 'Already exists'


def prune_tags(api, current_tag, current_sha):
    references = api('GET', 'git/matching-refs/tags/')
    managed = [ref for ref in references
               if ref['ref'].startswith('refs/tags/') and TAG.fullmatch(ref['ref'][10:])]
    current = next((ref for ref in managed if ref['ref'] == f'refs/tags/{current_tag}'), None)
    if current is None or commit_target(api, current['object']) != current_sha:
        raise ValueError('Current tag must be confirmed before any cleanup.')
    ranked = []
    # Read and validate the entire plan before deleting any reference.
    for ref in managed:
        sha = commit_target(api, ref['object'])
        commit = api('GET', f'git/commits/{sha}')
        date = datetime.fromisoformat(commit['committer']['date'].replace('Z', '+00:00'))
        if date.tzinfo is None:
            raise ValueError('Commit date must include a timezone.')
        ranked.append((date, ref['ref'], ref))
    # Latest commit dates first, with a stable tag-name tie-breaker.
    ranked.sort(key=lambda row: (row[0], row[1]), reverse=True)
    removed = []
    for _, name, ref in ranked[3:]:
        latest = api('GET', f'git/ref/{name[5:]}', missing_ok=True)
        if latest is None:
            continue
        if latest['object'] != ref['object']:
            raise ValueError(f'{name} changed during cleanup; deletion refused.')
        api('DELETE', f'git/refs/{name[5:]}')
        removed.append(name[10:])
    return removed


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
    title = subprocess.check_output(['git', 'show', '-s', '--format=%s', sha], text=True).strip()
    tag = version_tag(title)

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
                return None if response.status == 204 else json.load(response)
        except HTTPError as error:
            if missing_ok and error.code == 404:
                return None
            # Do not print request headers or response bodies.
            raise RuntimeError(f'GitHub API {method} failed with HTTP {error.code}.') from None

    result = ensure_tag(api, tag, sha)
    removed = prune_tags(api, tag, sha)
    message = (f'{result}: {tag} at {sha}. Old version tags removed: '
               f'{", ".join(removed) or "none"}. No release or APK created.')
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
