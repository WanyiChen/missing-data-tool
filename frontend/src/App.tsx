import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import DeleteAllMissingPage from "./pages/DeleteAllMissingPage";
import MissingDataMechanismPage from "./pages/MissingDataMechanismPage";
import ReportPage from "./pages/ReportPage";

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col pb-16">
                <div className="flex-1">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/delete-all-missing" element={<DeleteAllMissingPage />} />
                        <Route path="/missing-data-mechanism" element={<MissingDataMechanismPage />} />
                        <Route path="/report" element={<ReportPage />} />
                    </Routes>
                </div>

                <p className="text-sm text-center py-3 px-4 text-slate-700 fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-sm z-50">
                    Questions? Need support? Please contact us{" "}
                    <a
                        href="https://forms.gle/pSmk5geGHWaGP8US6"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline cursor-pointer"
                    >
                        here
                    </a>
                    .
                </p>
            </div>
        </Router>
    );
}

export default App;
