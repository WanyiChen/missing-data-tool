import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import DeleteAllMissingPage from "./pages/DeleteAllMissingPage";
import MissingDataMechanismPage from "./pages/MissingDataMechanismPage";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/delete-all-missing" element={<DeleteAllMissingPage />} />
                <Route path="/missing-data-mechanism" element={<MissingDataMechanismPage />} />
            </Routes>
        </Router>
    );
}

export default App;
