import logo from './logo.svg';
import './App.css';
import GifProcessor from './gifProcessor';
function App() {
  return (
    <div className="App">
      <h1>GIF Smusher</h1>
      <div style={{marginBottom: "3%"}}> Processing done locally in your browser just as god intended</div>
      <GifProcessor />
    </div>
  );
}

export default App;
