import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import styles from '../components/common/Button.module.css';

interface MissingDataMechanismData {
    mechanism: 'MCAR' | 'MAR_MNAR';
    p_value?: number;
}

const MissingDataMechanismPage: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<MissingDataMechanismData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState({
        mechanisms: false,
        littleTest: false
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('/api/missing-data-mechanism');
                if (res.data.success) {
                    setData(res.data);
                }
            } catch (error) {
                console.error('Error fetching missing data mechanism:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleSection = (section: 'mechanisms' | 'littleTest') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const getTitle = () => {
        if (!data) return 'Missing Data Mechanism';
        return data.mechanism === 'MCAR' 
            ? 'Possible missing data mechanism: MCAR'
            : 'Possible missing data mechanisms: MAR or MNAR';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <div className="mt-4 text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="w-full max-w-4xl px-4 py-8">
                <h1 className="text-4xl font-bold mb-8 text-center">{getTitle()}</h1>

                {/* Explanation of missing data mechanisms */}
                <div className="bg-white rounded-lg shadow-sm border mb-6">
                    <button
                        onClick={() => toggleSection('mechanisms')}
                        className={`w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            expandedSections.mechanisms ? 'rounded-t-lg' : 'rounded-lg'
                        }`}
                    >
                        <h2 className="text-xl font-semibold">Explanation of missing data mechanisms</h2>
                        {expandedSections.mechanisms ? (
                            <KeyboardArrowDownIcon className="text-gray-600" />
                        ) : (
                            <KeyboardArrowRightIcon className="text-gray-600" />
                        )}
                    </button>
                    
                    {expandedSections.mechanisms && (
                        <div className="px-6 pb-6 space-y-4 text-gray-700 rounded-b-lg">
                            <p>
                                Missing data occur for different reasons. Statistically, they are classified by three different missing data mechanisms:
                            </p>
                            
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Missing Completely at Random (MCAR):</h3>
                                <p>
                                    MCAR occurs when the missingness is completely unrelated to any variable and is totally random. For example, if you accidentally spilled some ink onto your survey forms and made some responses illegible, the data would be MCAR. MCAR is a strict assumption rarely satisfied in real-world datasets.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Missing at Random (MAR):</h3>
                                <p>
                                    MAR occurs when the missingness systematically depends on variables with complete information. For example, in a hypothetical mental health survey, the gender of all respondents is known, but men are more likely to answer a question about whether they have depression than women. In this case, the depression variable is MAR because the missingness depends on the gender variable.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Missing Not at Random (MNAR):</h3>
                                <p>
                                    MNAR occurs when the missingness depends on the variable of interest itself or on other unknown variables. For instance, in the hypothetical survey, if respondents with depression are less likely to answer the question about whether they have depression, the missing mechanism would be MNAR.
                                </p>
                            </div>

                            <p>
                                The MCAR assumption can be empirically tested using Little's MCAR test. However, the MAR and MNAR mechanisms are impossible to verify because they depend on unobserved data. Deciding how probable the data are to be MNAR often requires domain knowledge.
                            </p>
                        </div>
                    )}
                </div>

                {/* Explanation of Little's MCAR test */}
                <div className="bg-white rounded-lg shadow-sm border mb-8">
                    <button
                        onClick={() => toggleSection('littleTest')}
                        className={`w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            expandedSections.littleTest ? 'rounded-t-lg' : 'rounded-lg'
                        }`}
                    >
                        <h2 className="text-xl font-semibold">Explanation of Little's MCAR test</h2>
                        {expandedSections.littleTest ? (
                            <KeyboardArrowDownIcon className="text-gray-600" />
                        ) : (
                            <KeyboardArrowRightIcon className="text-gray-600" />
                        )}
                    </button>
                    
                    {expandedSections.littleTest && (
                        <div className="px-6 pb-6 space-y-4 text-gray-700 rounded-b-lg">
                            <p>
                                Little's MCAR test helps to assess whether data is MCAR. If p-value &ge; 0.05, data is considered MCAR. If p-value &lt; 0.05, data is considered MAR or MNAR. For more details of the test, check out the original paper: Little, R. J. (1988). A test of missing completely at random for multivariate data with missing values. Journal of the American statistical Association, 83(404), 1198–1202.
                            </p>
                            
                            <p>
                                Little's MCAR test has several limitations. It may fail to detect non-random missingness if the dataset is small. It also assumes that the data is normally distributed and could be sensitive to departures from the normality assumption.
                            </p>

                            {data?.p_value !== undefined && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <p className="font-semibold">Test Result:</p>
                                    <p>P-value: {data.p_value.toFixed(4)}</p>
                                    <p>
                                        {data.mechanism === 'MCAR' 
                                            ? 'Data appears to be Missing Completely at Random (MCAR)'
                                            : 'Data appears to be Missing at Random (MAR) or Missing Not at Random (MNAR)'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Back button at bottom like question pages */}
                <div className="flex justify-start">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`${styles.button} ${styles.secondary}`}
                        style={{ minWidth: 120 }}
                    >
                        ← Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissingDataMechanismPage;