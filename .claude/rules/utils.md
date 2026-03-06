## Utils

Extract logic into a utility function when it is used in two or more places, or when it encapsulates non-trivial domain logic that benefits from a clear name and testability.

Do not pre-emptively create utils for one-off logic — wait until duplication or complexity justifies it.

Utility functions should be pure functions whenever possible: take inputs, return outputs, no side effects. This makes them straightforward to unit test.
