ClusterFilter — sidebar list of topic clusters with checkboxes + color swatches, for toggling which clusters render on the graph canvas.

```jsx
<ClusterFilter
  clusters={[{id:"db",name:"database choice",color:"#DECD87",count:3}]}
  selected={["db"]}
  onToggle={(id) => {}}
/>
```
