import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import './App.css';

function App() {
  return (
    <Router>
      <div className='container'>
         <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/' element={<h1>Dashboard (Protected)</h1>} />
         </Routes>
      </div>
    </Router>
  );
}

export default App;
