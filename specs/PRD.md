# Product Brief

This document describes the product the repo is building, not the package-by-package implementation details. The implementation contracts live in `specs/` and the glossary lives in `CONTEXT.md` files.

## Problem

Design changes move slowly when the person who sees the UI change is not the person who can safely edit the code. The result is extra translation work, duplicated effort, and a lot of small UI fixes that never quite feel local to the product.

## Product shape

UI Copilot is a local assistant that works inside a React codebase and keeps the agent's scope narrow:

- it can reshape UI, local state, and styling
- it can plan multi-file work before editing
- it can mark architectural work as handoffs
- it can validate the result locally before push

## Non-goals

- replacing engineers
- editing business logic directly from natural language
- inventing new design-system primitives on the fly
- relying on hosted CI to catch AI syntax mistakes

## Primary surfaces

1. A workspace-level CLI for initialization, validation, and handoff scanning
2. A runtime package that exposes the `handoff()` boundary marker
3. An AST validator that enforces the boundary rules
4. Agent skill templates that teach the tool how to behave in a repo

## Success looks like

- the first usable UI edit happens quickly
- architectural changes are surfaced explicitly as handoffs
- the repo remains easy for engineers to review
- the docs reflect the language the tool actually uses

## Implementation note

This repo is intentionally workspace-based and React-first. The package specs own the technical details; this document stays at the level of product intent and scope.
