import { Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import AppLayout from './components/Layout';
import Home from './pages/Home';
import Bazi from './pages/Bazi';
import Ziwei from './pages/Ziwei';
import Nayin from './pages/Nayin';
import Liuyao from './pages/Liuyao';
import Meihua from './pages/Meihua';
import Fengshui from './pages/Fengshui';
import Mianxiang from './pages/Mianxiang';
import Dream from './pages/Dream';
import Lingqian from './pages/Lingqian';
import History from './pages/History';
import Profile from './pages/Profile';

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/bazi" element={<Bazi />} />
          <Route path="/ziwei" element={<Ziwei />} />
          <Route path="/nayin" element={<Nayin />} />
          <Route path="/liuyao" element={<Liuyao />} />
          <Route path="/meihua" element={<Meihua />} />
          <Route path="/fengshui" element={<Fengshui />} />
          <Route path="/mianxiang" element={<Mianxiang />} />
          <Route path="/dream" element={<Dream />} />
          <Route path="/lingqian" element={<Lingqian />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}
