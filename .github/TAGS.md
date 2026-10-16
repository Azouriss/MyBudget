# 🔎 Tag Version

Every push to `main` runs this workflow, including documentation and tooling
changes. It tags the **last commit of the push**, using its conventional title:

```text
✏️ docs@v0.1.1.0 add English documentation
→ docs-v0.1.1.0
```

The version must match the first entry in `versions/<platform>/VERSION.md`.
Increment the appropriate platform version before a new commit; the workflow
never invents a version or changes source files. Invalid titles or mismatched
histories fail before creating or deleting tags. A rerun accepts the same tag
on the same commit; reusing it for another commit fails without moving it.

After creating or confirming the tag, the workflow keeps the **three newest
version tags across all platforms**, ordered by the target commit's committer
date (tag name breaks ties). Older tags matching `<platform>-vX.X.X.X` are
deleted. Other tag names are excluded. This includes version tags that existed
before this workflow. Commits and GitHub releases are not deleted.

Cleanup starts only after the current tag and every candidate's metadata have
been checked. A tag whose target changed during cleanup is not deleted. If a
repository rule prevents deletion, the run fails and may leave more than three
tags; correct the rule and rerun it. Simultaneous runs share a concurrency group
with up to 100 pending runs, so a new push does not replace the pending run.

For a manual run: **Actions → 🔎 Tag Version → Run workflow → main**. No APK is
built and no GitHub release is created. Tags are lightweight, not signed; commits
continue to follow the signed-commit convention.

No personal token or signing secret is required. The temporary `GITHUB_TOKEN`
uses `contents: write`; repository rules must allow creation and deletion of
version tags. The job runs only in the public `Azouriss/MyBudget` repository on
standard `ubuntu-24.04`, without caches, artifacts or an external build service.
Standard runners are [free for public repositories](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Français

Chaque push sur `main` lance **🔎 Tag Version**, même pour la documentation ou
l'outillage. Le dernier commit du push fournit la plateforme et la version du
tag, par exemple `docs-v0.1.1.0`. Son titre et la première entrée du fichier
`versions/<plateforme>/VERSION.md` doivent correspondre. Incrémenter la version
concernée avant chaque nouveau commit ; un tag existant n'est jamais déplacé.

Le workflow conserve les **trois tags de version les plus récents, toutes
plateformes confondues**, selon la date des commits ciblés, et supprime les plus
anciens. Les autres noms de tags sont exclus du nettoyage. Il ne supprime aucun
commit ni aucune release, et ne crée ni release ni APK. Les règles du dépôt
doivent autoriser la création et la suppression des tags par `GITHUB_TOKEN`.
