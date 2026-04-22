# AGENTS.md

This file documents the project-specific working agreements and product conventions for the `weekly-planner` repository.

## Communication

- Speak to the user in English.
- Keep the app UI and user-facing content in Spanish unless the user explicitly changes that direction.

## Standard Delivery Workflow

After every completed change set:

1. Run:
   ```bash
   docker compose down
   docker compose up -d --build
   ```
2. Confirm the container starts successfully.
3. Commit the validated changes to git.
4. Run:
   ```bash
   /Applications/Firefox.app/Contents/MacOS/firefox --private-window http://127.0.0.1:4173
   ```

Do not leave the repository dirty after a completed iteration.

## Product Direction

The app is an internal-use weekly planner for family logistics.

Current product expectations:

- Weekly planner for activities and transport.
- Spanish UI.
- Responsive layout for desktop and mobile.
- Recurring events supported.
- Editing specific occurrences from the calendar supported.
- Dockerized local app.
- PWA assets may exist, but there should be no visible install button in the UI unless the user asks for it again.

## Repository Conventions

- Prefer local-first implementation.
- Keep persistence simple unless a larger storage layer is explicitly requested.
- Use `apply_patch` for file edits.
- Do not revert or overwrite unrelated user changes.
- Prefer fast local inspection tools such as `rg`.
- Validate changes after editing instead of stopping at code modifications only.

## Git Safety

- Never rewrite or discard unrelated changes without explicit instruction.
- Prefer small, descriptive commits after a successful rebuild.
