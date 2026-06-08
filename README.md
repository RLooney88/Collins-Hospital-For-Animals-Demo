# Collins Hospital for Animals Demo

This repository is the reusable source template for veterinary demo sites.

## Important rule

Do **not** customize client/practice sites directly in this template repository.

For a new practice:

1. Duplicate this repository.
2. Rename the duplicate to something clearly tied to the practice name.
   - Example: `Bay-Ridge-Veterinary-Demo`
   - Example: `Happy-Paws-Animal-Hospital-Smart-Site`
3. Edit the duplicated repo's `site.config.json` and assets.
4. Build/validate/commit the duplicated repo.

The template repo should only receive reusable template improvements.

## Quick workflow for agents

1. Read `docs/SITE-DISCOVERY-CHECKLIST.md`.
2. Duplicate this repo into a practice-specific repo.
3. Update `site.config.json` in the duplicate.
4. Copy the same config to `frontend/src/site/site.config.json` until the apply script exists.
5. Replace brand assets in `frontend/public/brand/`.
6. Run `npm run build` from `frontend/`.
7. Check for leftovers from prior/demo practices.

See `docs/CREATE-NEW-VET-SITE.md` for the full workflow.
