# Pathways Flame Graph Component

## Overview

The `PathwaysFlameGraph` component is a React component that visualizes pathway hierarchies using a flame graph (sunburst chart) visualization. It's designed to display parent-child relationships between pathways and their significance metrics.

## Features

### Visualization
- **Hierarchical Display**: Shows pathways in a hierarchical structure based on parent-child relationships
- **Significance-based Sizing**: Wider segments indicate more significant pathways (lower p-values)
- **Color Coding**: Multiple color schemes based on different metrics:
  - P-Value (default): Green (significant), Orange (moderate), Red (not significant)
  - FDR: Similar color scheme based on false discovery rate
  - NES: Color based on normalized enrichment score
  - Gene Count: Gradient based on number of genes

### Interactive Features
- **Click to Explore**: Click on any segment to view detailed pathway information
- **Zoom Controls**: Zoom in/out and reset view functionality
- **Settings Panel**: Customizable visualization parameters
- **Orientation**: Horizontal or vertical layout options

### Data Display
- **Pathway Details**: Shows p-value, FDR, NES, and gene count
- **Gene Lists**: Optional display of leading edge genes
- **Complete Data**: Full pathway information in expandable dialog

## Usage

### Basic Usage
```tsx
import PathwaysFlameGraph from './components/PathwaysFlameGraph';

const MyComponent = () => {
  const pathways = [/* your pathway data */];
  
  return <PathwaysFlameGraph pathways={pathways} />;
};
```

### Data Structure
The component expects an array of pathway objects with the following structure:
```typescript
interface Pathway {
  ID: string;
  Pathway: string;
  "p-value": number;
  FDR: number;
  NES: number;
  "Leading edge genes": string | string[];
  "Parent pathway": string;
  // ... other fields
}
```

## Settings

### Color By
- **P-Value**: Color segments based on statistical significance
- **FDR**: Color based on false discovery rate
- **NES**: Color based on normalized enrichment score
- **Gene Count**: Color based on number of genes

### Layout Options
- **Orientation**: Horizontal or vertical layout
- **Branch Values**: Total or remainder calculation method
- **Max Pathways**: Limit the number of pathways displayed

### Display Options
- **Show P-Values**: Toggle p-value display in details
- **Show FDR**: Toggle FDR display in details
- **Show Gene Lists**: Toggle gene list display in details

## Integration

The component is integrated into the main Pathways page and can be accessed via:
1. **Main Pathways Page**: Select "Flame Graph" from the view mode toggle
2. **Demo Page**: Visit `/flamegraph-demo` for a standalone demo

## Technical Details

### Dependencies
- **Plotly.js**: For the sunburst chart visualization
- **Material-UI**: For UI components and styling
- **React**: For component lifecycle and state management

### Performance
- **Memoized Calculations**: Uses React.useMemo for expensive data transformations
- **Efficient Rendering**: Only re-renders when data or settings change
- **Memory Management**: Properly cleans up Plotly instances

### Accessibility
- **Keyboard Navigation**: Full keyboard support for all controls
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Color schemes designed for accessibility

## Example Data

The component works with Reactome pathway data like:
```json
{
  "ID": "R-HSA-109582",
  "Pathway": "Hemostasis",
  "p-value": 0.0038264308286026782,
  "FDR": 0.18810247075153202,
  "NES": 2.8921271267638167,
  "Leading edge genes": "GATA3,MYB,ABL1,NRAS,PTPN11,IRF1,RASGRP1",
  "Parent pathway": ""
}
```

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: Responsive design for mobile devices
- **Touch Support**: Touch gestures for mobile interaction

## Future Enhancements

- **Export Functionality**: Save visualizations as images
- **Advanced Filtering**: Filter pathways by significance thresholds
- **Custom Color Schemes**: User-defined color palettes
- **Animation**: Smooth transitions between states
- **Search**: Find specific pathways in the visualization 