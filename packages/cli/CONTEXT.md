# CLI Context

This package defines the vocabulary for repo setup and scanning commands.

## Language

**Init**:
The one-time setup step that writes repo-local configuration and hook files.
_Avoid_: bootstrap, install, configure

**Validate**:
The local check that scans source files for boundary violations.
_Avoid_: lint, test, verify

**Scan handoffs**:
The command that extracts handoff records from source code for tracker export.
_Avoid_: search, grep, discover

**Hook**:
The local git entry point that runs validation before a push.
_Avoid_: trigger, script, callback
