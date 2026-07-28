Input — text field recessed into the surface as a soft neumorphic groove (inset shadow, no border) — text fields read as "pressed in," matching the tactile language.

```jsx
<Input placeholder="paste a transcript…" />
<Input mono prompt="$" placeholder='query "why postgres?"' />
```

Set `mono` + `prompt="$"` for the RAG query bar look; omit both for ordinary prose fields.
