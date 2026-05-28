# @whenis/booking

Booking-domain plugin for [whenis](../../README.md). Adds rules for: search-window patterns («впродовж N днів», «у найближчі N днів»), stay-duration («на N ночей»), weekend semantics («наступні/ці вихідні»), holiday refs («після свят», «на свята»). Includes `mostlyPastEnricher` that hints `suggest_next_month=true` when the user references a month that is ≥75 % elapsed.

License: MIT
