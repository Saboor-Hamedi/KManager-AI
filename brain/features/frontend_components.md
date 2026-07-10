# Frontend Components

React-based UI rendered inside the Electron window.

## Component Tree

```
App.jsx
├── Sidebar (ArtifactPicker)
├── Main Panel
│   ├── ForensicInput.jsx
│   ├── StatCards
│   │   ├── RiskScoreCard
│   │   ├── PredictionCard
│   │   └── ConsensusCard
│   ├── VisualAnalytics.jsx
│   └── [other panels]
└── Navigation
    ├── Audit Panel
    ├── Artifact Management
    └── Settings
```

## `App.jsx`

Root component (~625 lines). Central state management.

**State**:
```javascript
const [inputs, setInputs] = useState({ sample_id: 'Sample_0001' });
const [predictResult, setPredictResult] = useState(null);
const [loading, setLoading] = useState(false);
const [trajectoryData, setTrajectoryData] = useState(null);
const [shapData, setShapData] = useState(null);
const [counterfactualData, setCounterfactualData] = useState(null);
const [activeView, setActiveView] = useState('audit');
```

**Key Handlers**:
| Handler | Action |
|---------|--------|
| `handlePredict()` | POST `/predict` + `/trajectory` + `/shap` + `/counterfactual` |
| `handleInputChange(name, value)` | Updates `inputs` state |
| `handleReset()` | Calls IPC `reset-artifacts` (no-op) |
| `onPurge()` | Calls IPC `reset-artifacts` (no-op) |
| `handleSync()` | Calls IPC `sync-artifacts` |
| `handleConfirm()` | Opens confirm dialog via IPC |

**API Calls**: All target `http://localhost:8001/{endpoint}`.

## `ForensicInput.jsx`

Single-patient query interface.

```jsx
const ForensicInput = ({ inputs, onInputChange, onPredict, loading }) => (
  <div>
    <input
      type="text"
      value={inputs.sample_id}
      onChange={(e) => onInputChange('sample_id', e.target.value)}
      placeholder="Sample ID (e.g., Sample_0001)"
    />
    <button onClick={onPredict} disabled={loading}>
      {loading ? 'Analyzing...' : 'Audit'}
    </button>
  </div>
);
```

- Text input (not a dropdown) for `sample_id`
- "Audit" button triggers prediction

## `ArtifactPicker.jsx`

Sidebar/navigation panel for selecting analytical views.

**Modes**: Tabs/categories for different artifact types (models, visualizations, reports).

## `VisualAnalytics.jsx`

Displays prediction results with charts.

Props: `inputs`, `predictResult`, `trajectoryData`, `shapData`, `counterfactualData`.

Shows:
- Risk score gauge
- Model probability bar chart
- Trajectory plot (DPV feature perturbation vs risk)
- SHAP feature importance plot
- Counterfactual analysis

## `StatCards`

Three stat cards below the input showing single-patient results:

1. **Risk Score** — Mean probability across models (e.g., "0.87")
2. **Prediction** — Binary {0, 1} from `/predict`
3. **Consensus** — Majority vote across 5 models

## Data Flow

```
User types sample_id
  ↓
Clicks "Audit"
  ↓
App.jsx: handlePredict()
  ↓
POST http://localhost:8001/predict  ←  model predictions
POST http://localhost:8001/trajectory ← trajectory data
POST http://localhost:8001/shap      ← SHAP values
POST http://localhost:8001/counterfactual ← counterfactual
  ↓
setPredictResult(response)  ← React state update
setTrajectoryData(response)
setShapData(response)
setCounterfactualData(response)
  ↓
VisualAnalytics re-renders with new data
StatCards update with risk_score / prediction / consensus
```
