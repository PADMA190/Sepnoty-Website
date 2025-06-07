import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Digital Photo Organizer</h1>
      <p>Welcome to your AI-powered photo assistant!</p>
      <button onClick={() => electronAPI.openDirectoryDialog().then(path => console.log('Selected path:', path))}>Test Open Dir</button>
    </div>
  );
}

export default App;
