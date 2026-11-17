# FORENSIC AND VERIFICATION POLICY

Existing implementation, tests, historical behavior, and green CI are not ground truth. Derive expected behavior from Ashford's approved specifications, decision records, authoritative API/platform contracts, and observed evidence.

## Investigation
Preserve exact reproduction conditions and raw logs/artifacts. Identify input, environment, version, timestamp, and failing operation. Trace the executed path through parsing, validation, state transition, event emission, perception/knowledge updates, persistence, and result where relevant. Separate observations from hypotheses; test hypotheses; fix root cause; preserve an independently expected regression case.

## Test-oracle review
Classify tests as Valid, Insufficient, Invalid oracle, Duplicate, or Environment-dependent. A test is insufficient if it copies implementation logic, checks only invocation/non-null, omits failure/boundary paths, or mocks away the contract under investigation.

## Evidence levels
Report separately: source inspection; unit tests; integration/contract tests; build/package; CI; artifact upload and independently verified download/integrity; emulator/simulator; physical device/real OS behavior; real network/external-service/production runtime. Lower-level success never proves higher-level behavior. Never present mocks as device or production proof.

## Specification authority
When code/tests conflict with AGENTS.md, MASTER_SPEC.md, subsystem specifications, or approved decision records, treat the code/test as evidence to investigate, not authority. Do not silently alter confirmed product requirements to make tests pass.
