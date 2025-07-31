# Pathways API UI

A React-based user interface for exploring biological pathway data with multiple visualization options.

## Features

### Pathway Visualizations

1. **Table View** - Tabular display of pathway data with sorting and filtering
2. **Cards View** - Card-based layout for pathway information
3. **Tree View** - Hierarchical tree structure of pathway relationships
4. **Network View** - Interactive network graph with subflow grouping
5. **TreeMap View** - Hierarchical treemap visualization
6. **Gene Network** - Network visualization focused on gene relationships
7. **Flow Visualization** - **NEW!** Comprehensive pathway flow visualization with:
   - Hierarchical pathway relationships
   - Real-time filtering capabilities
   - NES score color coding
   - Parent-child relationship mapping
   - Advanced filtering options:
     - NES score range slider
     - P-value threshold
     - Gene count range
     - Pathway size filter
     - Text search
     - FDR threshold
     - Show/hide toggles for different pathway types

### Filtering Capabilities

The Flow Visualization includes a comprehensive filtering panel with:

- **NES Score Range**: Filter pathways by normalized enrichment score (-3 to 3)
- **P-value Threshold**: Show only pathways below specified significance level
- **Gene Count Range**: Filter by number of input genes (0-200)
- **Pathway Size Filter**: Filter by pathway size range (0-3000)
- **Text Search**: Search pathway names and IDs
- **FDR Threshold**: Filter by false discovery rate significance
- **Display Options**:
  - Show/hide standalone pathways
  - Show/hide parent-child relationships
  - Show only significant pathways (p < 0.05)

### Visual Features

- **Color-coded NES scores**: Green (>2.5), Lime (>2), Yellow (>1.5), Orange (>0), Red (≤0)
- **Significant pathway highlighting**: Green border for pathways with p < 0.05
- **Smooth animations**: Hover effects and transitions
- **Responsive design**: Works on different screen sizes
- **Real-time filtering**: No apply button needed
- **Filter count indicator**: Shows "X of Y pathways visible"

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the displayed URL (usually http://localhost:5173)

## Usage

1. Navigate to the Pathways page
2. Select a disease ID from the dropdown
3. Adjust the FDR threshold using the slider
4. Choose your preferred visualization from the tab buttons
5. For the Flow Visualization:
   - Use the filter panel on the left to refine results
   - Search for specific pathways
   - Adjust score ranges and thresholds
   - Toggle display options as needed

## Technical Details

- Built with React 19 and TypeScript
- Uses React Flow for network visualizations
- Material-UI for components and styling
- Dagre for automatic layout
- Responsive design with Tailwind CSS classes
- Real-time data filtering with React hooks

## API Integration

The UI connects to a FastAPI backend service that provides pathway data in the following format:

```json
{
  "ID": "R-HSA-109582",
  "Pathway": "Hemostasis",
  "ES": 0.347,
  "NES": 2.892,
  "FDR": 0.188,
  "p-value": 0.0038,
  "Number of input genes": 40,
  "Leading edge genes": "GATA3,MYB,ABL1,NRAS,PTPN11,IRF1,RASGRP1",
  "Pathway size": 706,
  "Parent pathway": "R-HSA-parent-id"
}
```
