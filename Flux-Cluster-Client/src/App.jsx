import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Base from './components/Base'

import Home from './pages/Home';
import UploadBefore from "./pages/UploadBefore";
import JoinBefore from "./pages/JoinBefore";
import JoinAfter from "./pages/JoinAfter";
import UploadAfter from "./pages/UploadAfter";



const App = () => {
  return (

    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Base childComponent={Home} />}
        />
        <Route
          path="/upload"
          element={<Base childComponent={UploadBefore} />}
        />
        <Route
          path="/render-main"
          element={<Base childComponent={UploadAfter} />}
        />
        <Route
          path="/join"
          element={<Base childComponent={JoinBefore} />}
        />
        <Route
          path="/joined"
          element={<Base childComponent={JoinAfter} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
