# WORKFLOW EXECUTION POLICY

- Own routine investigation and execution through verified completion. Never stop after an investigation summary, job launch, build, upload, or download.
- Track async run IDs, poll them, inspect logs/reports/artifacts, diagnose failures, fix in-scope causes, and rerun the smallest sufficient set.
- While jobs run, perform independent safe work. Reuse verified evidence; avoid idle waiting and redundant broad reruns.
- Do not send progress-only updates and wait. Do not delegate repository checks, CI/log retrieval, builds, packaging, or artifact inspection when tools allow.
- Verify artifact existence, contents, size, integrity, and downloadability. Upload success is not proof of a usable download.
- Preserve Ashford's specifications, save data, project isolation, and existing work. No force-push, destructive reset, unauthorized merge, release, deployment, or production mutation.
- Report repository/branch, baseline/final SHA, changed files, exact checks, CI IDs, verified artifact links, unperformed checks, and blockers. Never claim unobserved success.
