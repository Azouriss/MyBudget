# Automatic frontend tags

The **Tag frontend version** workflow runs when `versions/frontend/VERSION.md`
changes on `main`. Its first version heading determines the lightweight Git tag,
for example `frontend-v0.1.0.0`. The tag points to the exact triggering commit.
It does not increment the version, build an APK or create a GitHub release.

To tag the current version manually, open **Actions → Tag frontend version →
Run workflow**, select `main` and run it. The workflow must first be pushed to
`main`. An existing tag on the same commit is accepted; a different target fails
without moving the tag. Editing history without incrementing the version can
therefore require no new tag and produce that explicit failure.

No personal token or signing secret is needed. The workflow uses GitHub's
temporary `GITHUB_TOKEN` with `contents: write` for tag creation. Repository
rules must permit that token to create `frontend-v*` tags. Tags are lightweight,
not cryptographically signed; this does not change the signed-commit convention.

Only the public `Azouriss/MyBudget` repository can run this job. It uses the
standard `ubuntu-24.04` runner, with no Actions artifact uploads, cache storage,
paid runner or external build service. Standard runners are
[free for public repositories](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Français

À chaque modification de `versions/frontend/VERSION.md` poussée sur `main`, le
workflow crée le tag `frontend-vX.X.X.X` de la première entrée, sur le commit
concerné. Il ne modifie pas la version et ne crée ni release ni APK.

Pour le premier tag ou un lancement manuel : **Actions → Tag frontend version →
Run workflow → main**. Un tag existant n'est jamais déplacé. Aucun secret à
ajouter ; les règles du dépôt doivent autoriser la création de ces tags par le
`GITHUB_TOKEN`. Le runner standard est gratuit tant que le dépôt est public.
