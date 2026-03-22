import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <h1 className="text-4xl font-bold text-primary mb-4">TrackMUN</h1>
            <p className="text-lg text-default-600">Model United Nations Platform</p>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
