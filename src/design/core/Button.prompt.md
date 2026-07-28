Button — the primary interactive control. `secondary` and `ghost` are soft-molded neumorphic (raised shadow, same tone as surface, presses into an inset groove on click); `primary`/`correction` keep their gradient fill with a matching raised/pressed shadow for physicality.

```jsx
<Button variant="primary">Ingest transcript</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="correction">Supersede</Button>
```

Variants: `primary` (gold fill, main actions), `secondary` (outlined, neutral actions), `ghost` (text-only, low-emphasis), `correction` (bronze fill — use for actions that supersede/correct a prior claim). Sizes: `sm`, `md` (default), `lg`.
