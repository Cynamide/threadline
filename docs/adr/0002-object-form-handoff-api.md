# Object-form-only handoff API

`handoff()` uses a single object argument because the object shape is explicit, AST-friendly, and easier to validate than positional arguments. That choice keeps the ID, title, description, and fallback attached to one stable structure, which makes scanning and issue export much more reliable.
