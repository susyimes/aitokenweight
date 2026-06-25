# aitokenweight Productization Plan

## Direction

Keep aitokenweight as a lightweight, playful, shareable AI Token energy poster tool. The product should make token usage feel concrete and social, not become a billing system, usage monitor, carbon accounting service, or enterprise dashboard.

## Current Product Promise

- Input today's total token count and a developer name.
- Generate a visually shareable poster.
- Express the estimated energy in familiar everyday comparisons.
- Support copy summary, random comparison refresh, and PNG export.

## Productization Priorities

1. First-time clarity
   - Keep the first screen focused on one number and one name.
   - Explain that the energy conversion is an estimate for expression, not an audit.
   - Avoid adding long educational text to the poster itself.

2. Input ergonomics
   - Accept pasted values such as `8620000`, `8,620,000`, or spaced numbers.
   - Keep quick presets playful and recognizable.
   - Let advanced users adjust the Wh / 1K tokens coefficient without making it the default path.

3. Poster usefulness
   - Keep poster text short, high-contrast, and mobile-readable.
   - Keep PNG export self-contained and reliable across desktop and mobile.
   - Avoid false precision in the share copy.

4. Trust boundary
   - Show the calculation basis near the input.
   - Use wording such as "estimate" and "for social expression".
   - Do not imply real metering, billing, emissions accounting, or hardware telemetry.

5. Mobile-first quality
   - Preserve large tap targets for the input, presets, and poster actions.
   - Check long Chinese labels and long developer names.
   - Ensure toolbar wrapping does not hide export or copy actions.

## Implemented First Slice

- Token input now accepts formatted pasted numbers and displays thousands separators.
- Quick presets now describe common usage levels.
- A compact "estimation basis" section shows the default coefficient and lets users adjust it.

## Next Candidate Slices

- Add a tiny preview estimate on the input page before generating the poster.
- Improve exported PNG filename with the developer name.
- Add a mobile screenshot check to the release checklist.
