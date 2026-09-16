import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Base from './components/Base'

import Home from './pages/Home';
import UploadBefore from "./pages/UploadBefore";



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
          path="/"
          element={<Base childComponent={Home} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
